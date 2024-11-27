import { PluginSettingTab, App, Setting } from "obsidian";
import MDParser from "./main";


export class SettingTab extends PluginSettingTab {
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