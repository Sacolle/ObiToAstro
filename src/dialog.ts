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
	onSubmit: () => void

	constructor(app: App, plugin: MDParser, onSubmit: () => void) {
		super(app);
		this.plugin = plugin
		this.onSubmit = onSubmit
		this.setTitle('Exportar o arquivo');
		this.setup()
	}

	setup(){
		let descriptor = new Setting(this.contentEl)
			.setName('Save Folder:')
			.setDesc(`Local em que o arquivo e relacionados serão salvos:\n${
				this.plugin.settings.savePath
			}`)
			.addButton(button => button
				.setButtonText("Selecionar")
				.onClick(async () => {
					const folderName = folderSelector()
					this.plugin.settings.savePath = folderName;
					descriptor.setDesc(
						`Local em que o arquivo e relacionados serão salvos:\n${
							this.plugin.settings.savePath
						}`
					)
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

		new Setting(this.contentEl)
		.addButton((btn) =>
			btn
			.setButtonText('Submit')
			.setCta()
			.onClick(() => {
				this.close();
				this.onSubmit();
			}));
	}
}