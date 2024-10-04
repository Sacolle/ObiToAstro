import { App, getAllTags,  Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, Vault } from 'obsidian';

import slugify from '@sindresorhus/slugify';
import { writeFile, copyFile } from "fs/promises"

// Remember to rename these classes and interfaces!

interface MDPSettings {
	savePath: string;
	imgFolder: string;
	baseUrl: string;
	author: string;
}

const DEFAULT_SETTINGS: MDPSettings = {
	savePath: 'default',
	imgFolder: 'images',
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
						await copyFile(`${settings.imgFolder}/${link}`, `${settings.savePath}/public/${link}`)
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

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('arrow-up-from-line', 'Upload To Website', async () => await parseFiles(this.app, this.settings));		 
		this.addCommand({
			id: "parse-obsidian-files",
			name: "Parse Obsidian Files",
			callback: async () => await parseFiles(this.app, this.settings),
		}); 
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}


	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MDParser;

	constructor(app: App, plugin: MDParser) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Save Path:')
			.setDesc('Local do projeto Astro, full path')
			.addText(text => text
				.setValue(this.plugin.settings.savePath)
				.onChange(async (value) => {
					this.plugin.settings.savePath= value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Path To Image Folder:')
			.setDesc('Local onde as imagens estão salvas neste Vault, full path.')
			.addText(text => text
				.setValue(this.plugin.settings.imgFolder)
				.onChange(async (value) => {
					this.plugin.settings.imgFolder= value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Base URL:')
			.setDesc('Path base do deploy do site: ')
			.addText(text => text
				.setValue(this.plugin.settings.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.baseUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Author Name:')
			.setDesc('Autor dos arquivos gerados')
			.addText(text => text
				.setValue(this.plugin.settings.author)
				.onChange(async (value) => {
					this.plugin.settings.author= value;
					await this.plugin.saveSettings();
				}));
	}
}
