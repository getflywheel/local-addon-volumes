const path = require('path');

module.exports = function (context) {

	const Component = context.React.Component;
	const React = context.React;
	const $ = context.jQuery;
	const docker = context.docker;
	const {remote} = context.electron;
	const dialog = remote.dialog;
	const sendEvent = context.events.send;

	const pressmaticPath = remote.app.getAppPath();

	const siteData = remote.require(path.join(pressmaticPath, './helpers/site-data'));
	const startSite = remote.require(path.join(pressmaticPath, './main/actions-sites/startSite'));

	return class SiteInfoVolumes extends Component {
		constructor(props) {
			super(props);

			this.state = {
				volumes: [],
				ports: [],
				path: null,
				provisioning: false,
				isChanged: false
			};

			this.inspectContainer = this.inspectContainer.bind(this);
			this.stylesheetPath = path.resolve(__dirname, '../style.css');
			this.newVolumeKeyDown = this.newVolumeKeyDown.bind(this);
			this.removeVolume = this.removeVolume.bind(this);
			this.openFolderDialog = this.openFolderDialog.bind(this);
			this.remapVolumes = this.remapVolumes.bind(this);
		}

		componentDidMount() {

			this.inspectContainer();

		}

		inspectContainer() {

			let siteID = this.props.params.siteID;
			let site = this.props.sites[siteID];

			docker(`inspect ${site.container}`).then(stdout => {

				let parsedOutput;

				try {
					parsedOutput = JSON.parse(stdout);
				} catch (e) {
					console.error(e);
					return false;
				}

				let containerInfo = parsedOutput[0];
				let containerVolumes = [];
				let containerPorts = [];

				containerInfo.Mounts.forEach(mount => {
					containerVolumes.push({source: mount.Source, dest: mount.Destination});
				});

				Object.keys(containerInfo.NetworkSettings.Ports).forEach(port => {

					let portInfo = containerInfo.NetworkSettings.Ports[port][0];

					containerPorts.push({hostPort: portInfo.HostPort, containerPort: port.replace('/tcp', '')});

				});

				this.setState({
					path: containerInfo.Path,
					ports: containerPorts,
					volumes: containerVolumes
				});

			});

		}

		newVolumeKeyDown(event) {

			let volumes = this.state.volumes;

			let target = event.target.id == 'add-host-source' ? 'source' : 'dest';
			let ref = Math.round(Math.random() * 1000);

			volumes.push({
				source: '',
				dest: '',
				ref
			});

			event.target.value = '';

			this.setState({
				volumes
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

		volumeOnChange(input, index, event) {

			let volumes = this.state.volumes;

			volumes[index][input] = event.target.value;

			this.setState({
				volumes,
				isChanged: true
			});

		}

		removeVolume(index) {

			let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				buttons: ['Yes', 'No'],
				title: 'Confirm',
				message: `Are you sure you want to remove this volume? This may cause your site to not function properly.`
			});

			if (choice !== 0) {
				return;
			}

			this.setState({
				volumes: this.state.volumes.filter((_, i) => i !== index),
				isChanged: true
			});

		}

		openFolderDialog(index) {

			let dialogResult = dialog.showOpenDialog(remote.getCurrentWindow(), {properties: ['createDirectory', 'openDirectory', 'openFile']});
			let volumes = this.state.volumes;

			if ( dialogResult ) {

				if ( dialogResult[0].indexOf('/Users') !== 0 ) {
					return dialog.showErrorBox('Error', 'Sorry! You must provide a path in /Users.');
				}

				if ( isNaN(index) ) {

					volumes.push({
						source: dialogResult[0],
						dest: ''
					});

				} else {

					volumes[index].source = dialogResult[0];

				}

				this.setState({
					volumes,
					isChanged: true
				});

			}

		}

		remapVolumes() {

			let siteID = this.props.params.siteID;
			let site = this.props.sites[siteID];
			let imageID;

			let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				buttons: ['Cancel', 'Remap Volumes'],
				title: 'Confirm',
				message: `Are you sure you want to remap the volumes for this site? There may be inadvertent effects if volumes aren't mapped correctly.

Last but not least, make sure you have an up-to-date backup. 

There is no going back after this is done.`
			});

			if (choice === 0) {
				return;
			}

			this.setState({
				isChanged: false,
				provisioning: true
			});

			sendEvent('updateSiteStatus', siteID, 'provisioning');

			docker(`commit ${site.container}`).then(stdout => {

				imageID = stdout.trim();

				let portsStr = ``;
				let volumeMappingsStr = ``;
				let oldSiteContainer = site.container;

				this.state.ports.forEach(port => {
					portsStr += ` -p ${port.hostPort}:${port.containerPort}`
				});

				this.state.volumes.forEach(volume => {
					volumeMappingsStr += ` -v "${volume.source}":"${volume.dest}"`
				});

				docker(`kill ${site.container}`).then(stdout => {

					docker(`run -itd ${portsStr.trim()} ${volumeMappingsStr.trim()} ${imageID} ${this.state.path}`).then((stdout) => {

						site.container = stdout.trim();

						if ( 'duplicateImage' in site ) {
							if ( typeof site.duplicateImage != 'string' ) {
								site.duplicateImage.push(imageID);
							} else {
								site.duplicateImage = [site.duplicateImage, imageID];
							}
						} else {
							site.duplicateImage = imageID;
						}

						siteData.updateSite(siteID, site);

						startSite(site).then(() => {
							sendEvent('updateSiteStatus', siteID, 'running');

							this.setState({
								provisioning: false
							});

							context.notifier.notify({
								title: 'Volumes Remapped',
								message: `Volumes for ${site.name} have been remapped.`
							});

						});

						docker(`rm ${oldSiteContainer}`);

					});

				});

			});

		}

		render() {

			return (
				<div className="volumes-container">
					<link rel="stylesheet" href={this.stylesheetPath}/>
					<table className="table-striped volumes-table">
						<thead>
						<tr>
							<th>Host Source</th>
							<th>Container Destination</th>
							<th></th>
						</tr>
						</thead>
						<tbody>
						{
							this.state.volumes.map((volume, index) => {
								let ref = 'ref' in volume ? volume.ref : `${volume.source}:${volume.dest}`;

								return <tr key={index}>
									<td className="volumes-table-source"><input type="text" value={volume.source}
									                                            placeholder="Host Source"
									                                            ref={`${ref}-source`}
									                                            onChange={this.volumeOnChange.bind(this, 'source', index)}/>
										<span className="icon icon-folder" onClick={this.openFolderDialog.bind(this, index)}></span>
									</td>
									<td className="volumes-table-dest"><input type="text" value={volume.dest}
									                                          placeholder="Container Destination"
									                                          ref={`${ref}-dest`}
									                                          onChange={this.volumeOnChange.bind(this, 'dest', index)}/>
									</td>
									<td>
										<span className="icon icon-cancel-circled"
										      onClick={this.removeVolume.bind(this, index)}></span>
									</td>
								</tr>
							})
						}
						<tr>
							<td className="volumes-table-source">
								<input type="text" id="add-host-source" placeholder="Add Host Source"
							           onKeyDown={this.newVolumeKeyDown}/>
								<span className="icon icon-folder" onClick={this.openFolderDialog.bind(this, 'new')}></span>
							</td>
							<td className="volumes-table-dest">
								<input type="text" id="add-container-dest" placeholder="Add Container Destination"
							           onKeyDown={this.newVolumeKeyDown}/>
							</td>
							<td>
							</td>
						</tr>
						</tbody>
					</table>

					<div className="form-actions">
						<button className="btn btn-form btn-primary btn-right" disabled={!this.state.isChanged || this.state.provisioning} onClick={this.remapVolumes}>
							{this.state.provisioning ? 'Remapping Volumes...' : 'Remap Volumes'}
						</button>
					</div>
				</div>
			);

		}
	}

};