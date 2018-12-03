const path = require('path');
const os = require('os');

module.exports = function (context) {

	const Component = context.React.Component;
	const React = context.React;
	const docker = context.docker.docker;
	const { remote } = context.electron;
	const dialog = remote.dialog;
	const sendEvent = context.events.send;

	const localPath = remote.app.getAppPath();

	const siteData = remote.require(path.join(localPath, './helpers/site-data'));
	const startSite = remote.require(path.join(localPath, './main/actions-sites/startSite'));
	const formatHomePath = remote.require('./helpers/format-home-path');

	return class SiteInfoVolumes extends Component {
		constructor (props) {
			super(props);

			this.state = {
				volumes: [],
				path: null,
				provisioning: false,
				isChanged: false,
			};

			this.inspectContainer = this.inspectContainer.bind(this);
			this.stylesheetPath = path.resolve(__dirname, '../style.css');
			this.newVolumeKeyDown = this.newVolumeKeyDown.bind(this);
			this.removeVolume = this.removeVolume.bind(this);
			this.openFolderDialog = this.openFolderDialog.bind(this);
			this.remapVolumes = this.remapVolumes.bind(this);
		}

		componentDidMount () {

			this.inspectContainer();

		}

		inspectContainer () {

			const siteID = this.props.params.siteID;
			const site = this.props.sites[siteID];

			docker().getContainer(site.container).inspect((err, containerInfo) => {

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

				docker().getContainer(site.container).inspect((err, containerInfo) => {

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

		newVolumeKeyDown (event) {

			const volumes = this.state.volumes;

			const target = event.target.id == 'add-host-source' ? 'source' : 'dest';
			const ref = Math.round(Math.random() * 1000);

			volumes.push({
				source: '',
				dest: '',
				ref,
			});

			event.target.value = '';

			this.setState({
				volumes,
			}, () => {

				switch (target) {
					case 'source':
						this.refs[`${ref}-source`].focus();
						break;

					case 'dest':
						this.refs[`${ref}-dest`].focus();
						break;
				}

			});

		}

		volumeOnChange (input, index, event) {

			const volumes = this.state.volumes;

			volumes[index][input] = event.target.value;

			this.setState({
				volumes,
				isChanged: true,
			});

		}

		removeVolume (index) {

			const choice = dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				buttons: ['Yes', 'No'],
				title: 'Confirm',
				message: `Are you sure you want to remove this volume? This may cause your site to not function properly.`,
			});

			if (choice !== 0) {
				return;
			}

			this.setState({
				volumes: this.state.volumes.filter((_, i) => i !== index),
				isChanged: true,
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
					isChanged: true,
				});

			}

		}

		remapVolumes () {

			const siteID = this.props.params.siteID;
			const site = this.props.sites[siteID];
			const errors = [];

			this.state.volumes.forEach((volume) => {

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

			const choice = dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				buttons: ['Cancel', 'Remap Volumes'],
				title: 'Confirm',
				message: `Are you sure you want to remap the volumes for this site? There may be inadvertent effects if volumes aren't mapped correctly.

Last but not least, make sure you have an up-to-date backup.

There is no going back after this is done.`,
			});

			if (choice === 0) {
				return;
			}

			this.setState({
				isChanged: false,
				provisioning: true,
			});

			sendEvent('updateSiteStatus', siteID, 'provisioning');

			docker().getContainer(site.container).commit().then((image) => {

				const oldSiteContainer = site.container;

				this.getPorts().then((ports) => {

					docker().getContainer(site.container).kill().then(() => {

						const exposedPorts = {};
						const portBindings = {};

						ports.forEach((port) => {
							exposedPorts[`${port.containerPort}/tcp`] = {};

							portBindings[`${port.containerPort}/tcp`] = [{
								'HostPort': port.hostPort.toString(),
							}];
						});

						docker().createContainer({
							'Image': image.Id,
							'Cmd': this.state.path,
							'Tty': true,
							'ExposedPorts': exposedPorts,
							'HostConfig': {
								'Binds': this.state.volumes.map((volume) => {
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
								sendEvent('updateSiteStatus', siteID, 'running');

								this.setState({
									provisioning: false,
								});

								context.notifier.notify({
									title: 'Volumes Remapped',
									message: `Volumes for ${site.name} have been remapped.`,
								});

							});

							docker().getContainer(oldSiteContainer).remove();

						});

					});

				});

			});

		}

		formatSource (index) {

			const volumes = this.state.volumes;

			volumes[index].source = formatHomePath(volumes[index].source);

			this.setState({
				volumes,
			});

		}

		formatDockerPath = (filepath) => {

			if (os.platform() !== 'win32') {
				return filepath;
			}

			const { root } = path.parse(filepath);
			return '/' + root.toLowerCase().replace(':', '').replace('\\', '/') + filepath.replace(root, '').replace(/\\/g, '/');

		}

		render () {

			return (
				<div className="VolumesContainer">
					<link rel="stylesheet" href={this.stylesheetPath}/>

					<ul className="TableList Form">
						<li className="TableListRow">
							<strong>Host Source</strong>
							<strong>Container Destination</strong>
						</li>
						{
							this.state.volumes.map((volume, index) => {
								const ref = 'ref' in volume ? volume.ref : `${volume.source}:${volume.dest}`;

								return <li className="TableListRow" key={index}>
									<div>
										<input type="text" value={volume.source} placeholder="Host Source"
										       ref={`${ref}-source`}
										       onChange={this.volumeOnChange.bind(this, 'source', index)}
										       onBlur={this.formatSource.bind(this, index)}/>

										<span className="OpenFolder button --Inline"
										      onClick={this.openFolderDialog.bind(this, index)}>
											Browse
										</span>
									</div>

									<div>
										<input type="text" value={volume.dest} placeholder="Container Destination"
										       ref={`${ref}-dest`}
										       onChange={this.volumeOnChange.bind(this, 'dest', index)}/>
									</div>

									<div>
										<span className="RemoveVolume" onClick={this.removeVolume.bind(this, index)}>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">
												<path
													d="M7.71 6.29L5.41 4l2.3-2.29A1 1 0 0 0 6.29.29L4 2.59 1.71.29A1 1 0 1 0 .29 1.71L2.59 4 .29 6.29a1 1 0 1 0 1.42 1.42L4 5.41l2.29 2.3a1 1 0 0 0 1.42-1.42z"/>
											</svg>
										</span>
									</div>
								</li>;
							})
						}
						<li className="TableListRow">
							<div>
								<input type="text" id="add-host-source" placeholder="Add Host Source"
								       onKeyDown={this.newVolumeKeyDown}/>

								<span className="OpenFolder button --Inline"
								      onClick={this.openFolderDialog.bind(this, 'new')}>
									Browse
								</span>
							</div>

							<div>
								<input type="text" id="add-container-dest" placeholder="Add Container Destination"
								       onKeyDown={this.newVolumeKeyDown}/>
							</div>

							<div/>
						</li>
					</ul>

					<div className="Bottom">
						<button className="--Green --Pill"
						        disabled={!this.state.isChanged || this.state.provisioning || this.props.siteStatus != 'running'}
						        onClick={this.remapVolumes}>
							{this.state.provisioning ? 'Remapping Volumes...' : this.props.siteStatus == 'running' ? 'Remap Volumes' : 'Start Site to Remap Volumes'}
						</button>
					</div>
				</div>
			);

		}
	};

};
