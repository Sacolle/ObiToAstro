import { App, Modal, Platform, Setting } from 'obsidian';
import MDParser from './main';


function folderSelector() : string{
	if(Platform.isDesktopApp){
		let folderPath: string = (window as any).electron.remote.dialog.showOpenDialogSync({
			title: 'Pick files to import',
			properties: ['openDirectory']
		})[0];
		console.log(folderPath)
		return folderPath
	}else{
		throw Error("O uso da extensão deve ser no desktop.")
	}
}


export class SaveModal extends Modal {

	plugin: MDParser;
	onSubmit: () => Promise<string | null>

	constructor(app: App, plugin: MDParser, onSubmit: () => Promise<string | null>) {
		super(app);
		this.plugin = plugin
		this.onSubmit = onSubmit
		this.setTitle('Exportar o arquivo');
		this.setup()
	}

	setup(){
		const saveFolderDescriptor = new Setting(this.contentEl)
			.setName('Save Folder:')
			.setDesc(`Local em que o arquivo e relacionados serão salvos:\n${
				this.plugin.settings.savePath
			}`)
			.addButton(button => button
				.setButtonText("Selecionar")
				.onClick(async () => {
					const folderName = folderSelector()
					this.plugin.settings.savePath = folderName;
					saveFolderDescriptor.setDesc(
						`Local em que o arquivo e relacionados serão salvos:\n${
							this.plugin.settings.savePath
						}`
					)
					await this.plugin.saveSettings();
				})
			)

		const imgFolderDescriptor = new Setting(this.contentEl)
			.setName('Image Folder:')
			.setDesc(`Local em que as imagens no Vault atual estão salvas:\n${
				this.plugin.settings.imgFolder
			}`)
			.addButton(button => button
				.setButtonText("Selecionar")
				.onClick(async () => {
					const folderName = folderSelector()
					this.plugin.settings.imgFolder = folderName;
					imgFolderDescriptor.setDesc(
						`Local em que as imagens no Vault atual estão salvas:\n${
						this.plugin.settings.imgFolder
					}`)
					await this.plugin.saveSettings();
				})
			)

		new Setting(this.contentEl)
			.setName('Base URL:')
			.setDesc('Path base do deploy do site: ')
			.addText(text => text
				.setValue(this.plugin.settings.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.baseUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(this.contentEl)
			.setName('Node do Autor:')
			.setDesc('Autor dos arquivos gerados')
			.addText(text => text
				.setValue(this.plugin.settings.author)
				.onChange(async (value) => {
					this.plugin.settings.author= value;
					await this.plugin.saveSettings();
				}));

		const p = this.contentEl.createEl('p', {text: ""})
		p.style.color = "red"

		new Setting(this.contentEl)
		.addButton((btn) =>
			btn
			.setButtonText('Submit')
			.setCta()
			.onClick(() => {
				this.onSubmit().then(err => {
					if(err){
						p.innerHTML = JSON.stringify(err)
					}else{
						p.innerHTML = ""
						this.close();
					}
				})
			}));
	}
}