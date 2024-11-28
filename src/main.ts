import { App, getAllTags,  Notice, Platform, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, Vault } from 'obsidian';

import slugify from '@sindresorhus/slugify';
import {stringify as YAMLstringify} from 'yaml'
import { writeFile, copyFile, unlink, stat } from "fs/promises"

import { SaveModal } from './dialog';

// Remember to rename these classes and interfaces!

interface MDPSettings {
	savePath: string;
	imgFolder:string;
	baseUrl: string;
	author: string;
}

const DEFAULT_SETTINGS: MDPSettings = {
	savePath: 'default',
	imgFolder: "images",
	baseUrl: "blog",
	author: "fulano"
}

type FileData = {
	name: string
	path: string
	tags: string[]
	createdAt: Date
	updatedAt: Date
	file: TFile
}

async function exportFile(app: App, file: TFile, { savePath, imgFolder, baseUrl, author }: MDPSettings){
	const fileMetadata = app.metadataCache.getFileCache(file)

	if(fileMetadata){
		const name = file.name.replace(".md", "")
		const tags = getAllTags(fileMetadata)
		if(!tags || tags.length == 0){
			return "Arquivo que deseja exportar não contém tags. (min 1)"
		}

		const frontMatter = YAMLstringify({
			title: name,
			author,
			createdAt: new Date(file.stat.ctime).toLocaleDateString('en-GB'),
			updatedAt: new Date(file.stat.mtime).toLocaleDateString('en-GB'),
			tags: tags.map(t => t.replace("#", "")),
		})

		let contents = await app.vault.read(file)
		//remove the frontMatter
		contents = contents.replace(/---(\n|.)*?---/, "")
		contents = `---\n${frontMatter}---\n# ${name}\n${contents}`  

		//troca os links para o site
		if(fileMetadata.links){
			for(const { original, link } of fileMetadata.links){
				//slugify muda pra kebab e troca non ascii pra ascii
				//slice remove [ ] extras
				contents = contents.replace(original, 
					`${original.slice(1, -1)}(/${baseUrl}/posts/${slugify(link)})`
				) 
			}
		}

		let embedsToExport: Array<{from: string, to: string}> = []
		//troca as imagens para o site
		if(fileMetadata.embeds){
			for(const { original, link } of fileMetadata.embeds){
				contents = contents.replace(original,
					//remove os ![[ ]] adicionais
					`!${original.slice(2, -1)}(./${link})`
				)
				embedsToExport.push({from: `${imgFolder}/${link}`, to: `${savePath}/${link}`})
			}
		}
		const filename = `${savePath}/${slugify(name)}.md`

		try{
			await writeFile(filename, contents)
			Promise.all(embedsToExport.map(({from , to}) => copyFile(from, to)))
		}catch(e){
			//revert se nao deu certo
			await unlink(filename).catch(err => console.log("arquivo não criado: ", err))
			Promise.all(embedsToExport.map(({ to }) => unlink(to).catch(err => console.log(err))))
		}
		new Notice("Arquivo exportado com sucesso.")
		return null
	}else{
		return "Arquivo que deseja exportar não contém metadado no cache."
	}
}

export default class MDParser extends Plugin {
	settings: MDPSettings;
	saveModal: SaveModal;
	selectedFile: TAbstractFile;

	async onload() {

		await this.loadSettings();

		this.saveModal = new SaveModal(this.app, this, async () => { 
			if(this.selectedFile instanceof TFile && this.selectedFile.extension == "md"){
				return exportFile(this.app, this.selectedFile, this.settings)
			}else{
				return "Arquivo que deseja exportar não é um arquivo MD"
			}
		})

		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			menu.addItem((item) => {
				item.setTitle('Exportar arquivo MD')
					.setIcon('arrow-up-from-line')
					.onClick(() => {
						this.selectedFile = file;
						this.saveModal.open()
					});
			});
		}));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
