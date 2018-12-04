import React, { Fragment } from 'react';
import path from 'path';
import os from 'os';
import { remote } from 'electron';
import { TableListRepeater, BrowseInput } from '@getflywheel/local-components';
import confirm from 'local/renderer/confirm';

const { dialog } = remote;
const localPath = remote.app.getAppPath();
const siteData = remote.require(path.join(localPath, './helpers/site-data'));
const startSite = remote.require(path.join(localPath, './main/actions-sites/startSite'));
const formatHomePath = remote.require('./helpers/format-home-path');

export default class SiteInfoVolumes extends React.Component {

	constructor (props) {
		super(props);

		this.state = {
			volumes: [],
			path: null,
			provisioning: false,
			isChanged: false,
		};

		this.inspectContainer = this.inspectContainer.bind(this);
		this.openFolderDialog = this.openFolderDialog.bind(this);
		this.remapVolumes = this.remapVolumes.bind(this);
	}

	componentDidMount () {

		this.inspectContainer();

	}

	inspectContainer () {

		const siteID = this.props.params.siteID;
		const site = this.props.sites[siteID];

		this.props.docker().getContainer(site.container).inspect((err, containerInfo) => {

			const containerVolumes = [];

			containerInfo.Mounts.forEach((mount) => {
				const source = os.platform() === 'win32' ? path.resolve(mount.Source.replace('/c/', '/')) : mount.Source;
				containerVolumes.push({ source: source, dest: mount.Destination });
			});


			this.setState({
				path: containerInfo.Path,
				volumes: containerVolumes,
			});

		});

	}

	getPorts () {

		return new Promise((resolve) => {

			const siteID = this.props.params.siteID;
			const site = this.props.sites[siteID];

			this.props.docker().getContainer(site.container).inspect((err, containerInfo) => {

				const containerPorts = [];

				try {

					Object.keys(containerInfo.NetworkSettings.Ports).forEach((port) => {

						const portInfo = containerInfo.NetworkSettings.Ports[port][0];

						containerPorts.push({ hostPort: portInfo.HostPort, containerPort: port.replace('/tcp', '') });

					});

				} catch (e) {
					console.warn(e);
				}

				resolve(containerPorts);

			});

		});

	}

	openFolderDialog (index) {

		const dialogResult = dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['createDirectory', 'openDirectory', 'openFile'] });
		const volumes = this.state.volumes;

		if (dialogResult) {

			if (os.platform() === 'win32') {
				if (dialogResult[0].indexOf('C:\\Users') !== 0) {
					return dialog.showErrorBox('Error', 'Sorry! You must provide a path in C:\\Users.');
				}
			} else {
				if (dialogResult[0].indexOf('/Users') !== 0) {
					return dialog.showErrorBox('Error', 'Sorry! You must provide a path in /Users.');
				}
			}

			if (isNaN(index)) {

				volumes.push({
					source: dialogResult[0],
					dest: '',
				});

			} else {

				volumes[index].source = dialogResult[0];

			}

			this.setState({
				volumes,
			});

		}

	}

	async remapVolumes (volumes) {

		const siteID = this.props.params.siteID;
		const site = this.props.sites[siteID];
		const errors = [];

		volumes.forEach((volume) => {

			if (!volume.source.trim() || !volume.dest.trim()) {
				return errors.push('Empty source or destination.');
			}

			if (os.platform() === 'win32') {
				if (formatHomePath(volume.source).indexOf('C:\\Users') !== 0) {
					return errors.push('Path does not start with C:\\Users');
				}
			} else {
				if (volume.source.indexOf('/') !== 0 || volume.dest.indexOf('/') !== 0) {
					return errors.push('Path does not start with slash.');
				}

				if (formatHomePath(volume.source).indexOf('/Users') !== 0 && formatHomePath(volume.source).indexOf('/Volumes') !== 0) {
					return errors.push('Path does not start with /Users or /Volumes');
				}
			}

		});

		if (errors.length) {

			return dialog.showErrorBox('Invalid Paths Provided', `Sorry! There were invalid paths provided.

Please ensure that all paths have a valid source and destination.

Also, all source paths must begin with either /Users or /Volumes.`);

		}

		await confirm({
			title: 'Are you sure you want to remap the volumes for this site?',
			message: <Fragment>
				<p>There may be inadvertent effects if volumes aren't mapped correctly. Make sure you have an up-to-date
					backup.</p>
				<p>There is no going back after this is done.</p>
			</Fragment>,
			buttonText: 'Remap Volumes',
		});

		this.setState({
			provisioning: true,
			volumes,
		});

		this.props.sendEvent('updateSiteStatus', siteID, 'provisioning');

		this.props.docker().getContainer(site.container).commit().then((image) => {

			const oldSiteContainer = site.container;

			this.getPorts().then((ports) => {

				this.props.docker().getContainer(site.container).kill().then(() => {

					const exposedPorts = {};
					const portBindings = {};

					ports.forEach((port) => {
						exposedPorts[`${port.containerPort}/tcp`] = {};

						portBindings[`${port.containerPort}/tcp`] = [{
							'HostPort': port.hostPort.toString(),
						}];
					});

					this.props.docker().createContainer({
						'Image': image.Id,
						'Cmd': this.state.path,
						'Tty': true,
						'ExposedPorts': exposedPorts,
						'HostConfig': {
							'Binds': volumes.map((volume) => {
								const source = this.formatDockerPath(volume.source);
								return `${formatHomePath(source)}:${volume.dest}`;
							}),
							'PortBindings': portBindings,
						},
					}).then((container) => {

						site.container = container.id;

						let clonedImages = [];

						if ('clonedImage' in site) {
							if (typeof site.clonedImage === 'string' && site.clonedImage) {
								clonedImages = [site.clonedImage];
							} else if (Array.isArray(site.clonedImage)) {
								clonedImages = [...site.clonedImage];
							}
						}

						clonedImages.push(image.Id);

						site.clonedImage = clonedImages;
						siteData.updateSite(siteID, site);

						startSite(site).then(() => {
							this.props.sendEvent('updateSiteStatus', siteID, 'running');

							this.setState({
								provisioning: false,
							});

							this.props.notifier.notify({
								title: 'Volumes Remapped',
								message: `Volumes for ${site.name} have been remapped.`,
							});

						});

						this.props.docker().getContainer(oldSiteContainer).remove();

					});

				});

			});

		});

	}

	formatDockerPath = (filepath) => {

		if (os.platform() !== 'win32') {
			return filepath;
		}

		const { root } = path.parse(filepath);
		return '/' + root.toLowerCase().replace(':', '').replace('\\', '/') + filepath.replace(root, '').replace(/\\/g, '/');

	};

	render () {

		const header = (
			<Fragment>
				<strong className="TableListRowHeader__SeparatorRight" style={{ width: '50%' }}>Host Source</strong>
				<strong style={{ width: '50%' }}>Container Destination</strong>
			</Fragment>
		);

		const repeatingContent = (volume, index, updateItem) => (
			<Fragment>
				<div className="TableListRow__SeparatorRight">
					<BrowseInput placeholder="Host Source" value={volume.source} onChange={(source) => {
						volume.source = formatHomePath(source);

						if (os.platform() === 'win32' && volume.source.indexOf('C:\\Users') !== 0) {
							dialog.showErrorBox('Error', 'Sorry! You must provide a path in C:\\Users.');

							return false;
						} else if (volume.source.indexOf('/Users') !== 0) {
							dialog.showErrorBox('Error', 'Sorry! You must provide a path in /Users.');

							return false;
						}

						updateItem(volume);
					}} dialogTitle="Host Source" dialogProperties={['createDirectory', 'openDirectory', 'openFile']}/>
				</div>

				<div className="TableListRow__Input">
					<input placeholder="Container Destination" value={volume.dest} onChange={(e) => {
						volume.dest = e.target.value;
						updateItem(volume);
					}}/>
				</div>
			</Fragment>
		);

		return (
			<div style={{ flex: '1', overflowY: 'auto' }}>
				<TableListRepeater header={header} repeatingContent={repeatingContent}
								   onSubmit={this.remapVolumes}
								   submitDisabled={this.state.provisioning || this.props.siteStatus != 'running'}
								   submitLabel={this.state.provisioning ? 'Remapping Volumes...' : this.props.siteStatus == 'running' ? 'Remap Volumes' : 'Start Site to Remap Volumes'}
								   labelSingular="Volume"
								   data={this.state.volumes}
								   itemTemplate={{
									   source: '',
									   dest: '',
								   }}/>
			</div>
		);

	}
}
