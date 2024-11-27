import { App, getAllTags,  Notice, Platform, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, Vault } from 'obsidian';

import slugify from '@sindresorhus/slugify';
import { writeFile, copyFile } from "fs/promises"

import { SaveModal } from './dialog';

// Remember to rename these classes and interfaces!

interface MDPSettings {
	savePath: string;
	baseUrl: string;
	author: string;
}

const DEFAULT_SETTINGS: MDPSettings = {
	savePath: 'default',
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

async function mutateAndSaveFile(vault: Vault, fileData: FileData, links: Map<string, string>, settings: MDPSettings){
	let contents = await vault.read(fileData.file)
	//replace the links and embeds
	for(const [key, value] of links){
		contents = contents.replace(key, value)
	}
	//remove front matter
	contents = contents.replace(/---(\n|.)*?---/, "")
	
	if(fileData.tags.length == 1){
		new Notice(`Parse do Arquivo ${fileData.name} falhou.
O arquivo precisa de pelo menos 1 tag além da tag post`);
		return
	}

	//TODO: maybe use a lib that does yaml
	const frontMatter = `---
tags:${fileData.tags.filter(t => t !== "#post").map(t => `\n  - ${t.replace("#","")}`).join("")}
author: ${settings.author}
title: ${fileData.name}
createdAt: ${fileData.createdAt.toLocaleDateString('en-GB')}
updatedAt: ${fileData.updatedAt.toLocaleDateString('en-GB')}
---`

	contents = `${frontMatter}\n# ${fileData.name}\n${contents}`  
	const filename = `${settings.savePath}/src/content/posts/${slugify(fileData.name)}.md`
	//if file exists, delete first
	try{
		await writeFile(filename, contents)
		new Notice(`Parse do Arquivo ${fileData.name} ocorreu com sucesso!`);
		return true
	}catch(e){
		new Notice(`Parse do Arquivo ${fileData.name} falhou.\n${JSON.stringify(e)}`);
		return false
	}
}

async function parseFiles(app: App, settings: MDPSettings){
	const files = app.vault.getMarkdownFiles()
	
	const links = new Map<string, string>()

	//TODO: validate the image folder
	const { baseUrl } = settings
	const parsedFiles: FileData[] = []

	for(const f of files){
		const fileMetadata = app.metadataCache.getFileCache(f)
		if(fileMetadata?.frontmatter?.tags?.includes('post')){
			const fileData = {
				name: f.name.replace(".md", ""), 
				path: f.path,
				tags: getAllTags(fileMetadata) ?? [],
				createdAt: new Date(f.stat.ctime),
				updatedAt: new Date(f.stat.mtime),
				file: f
			}
			parsedFiles.push(fileData)

			//add the embeds to the dictionary
			if(fileMetadata.embeds){
				for(const { original, link} of fileMetadata.embeds){
					try{
						//await copyFile(`${settings.imgFolder}/${link}`, `${settings.savePath}/public/${link}`)
					}catch(e){
						console.log("erro no copy da imagem: ", link, e)
					}
					links.set(original, 
						`${original.replace("[[", "[").replace("]]", "]")}(/${baseUrl}/${link})`
					)
				}
			}
			if(fileMetadata.links){
				for(const { original, link } of fileMetadata.links){
					//slugify muda pra kebab e troca non ascii pra ascii
					links.set(original, 
						`${original.replace("[[", "[").replace("]]", "]")}(/${baseUrl}/posts/${slugify(link)})`
					) 
				}
			}
		}
	}

	const results = await Promise.all(parsedFiles.map(f => mutateAndSaveFile(app.vault, f, links, settings)))

	if(results.every((v) => v)){
		new Notice(`Parse dos Arquivos realizado com sucesso!`);
	}
}

export default class MDParser extends Plugin {
	settings: MDPSettings;
	saveModal: SaveModal;
	selectedFile: TAbstractFile;

	async onload() {

		await this.loadSettings();

		this.saveModal = new SaveModal(this.app, this, () => console.log(this.selectedFile))

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
		/*

		this.addRibbonIcon('arrow-up-from-line', 'Upload To Website', async () => await parseFiles(this.app, this.settings));		 
		this.addCommand({
			id: "parse-obsidian-files",
			name: "Parse Obsidian Files",
			callback: async () => await parseFiles(this.app, this.settings),
		}); 
		*/
		// This adds a settings tab so the user can configure various aspects of the plugin
		//this.addSettingTab(new SettingTab(this.app, this));
	}

	async exportFile(file: TAbstractFile){
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
