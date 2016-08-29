const path = require('path');

module.exports = function (context) {

	const Component = context.React.Component;
	const React = context.React;
	const $ = context.jQuery;
	const docker = context.docker;
	const {remote} = context.electron;
	const dialog = remote.dialog;

	return class SiteInfoVolumes extends Component {
		constructor(props) {
			super(props);

			this.state = {
				volumes: [],
				ports: [],
				path: null
			};

			this.inspectContainer = this.inspectContainer.bind(this);
			this.stylesheetPath = path.resolve(__dirname, '../style.css');
			this.newVolumeKeyDown = this.newVolumeKeyDown.bind(this);
			this.removeVolume = this.removeVolume.bind(this);
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
					path: containerInfo.path,
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
				volumes
			});

		}

		removeVolume(index) {

			let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				buttons: ['Yes', 'No'],
				title: 'Confirm',
				message: `Are you sure you want to remove this volume? This may cause your site to not function properly.`
			});

			if ( choice !== 0 ) {
				return;
			}

			this.setState({
				volumes: this.state.volumes.filter((_, i) => i !== index)
			});

		}

		render() {

			return (
				<div>
					<link rel="stylesheet" href={this.stylesheetPath}/>
					<table className="table-striped volumes-table">
						<thead>
						<tr>
							<th>Host Source</th>
							<th colSpan="2">Container Destination</th>
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
									</td>
									<td className="volumes-table-dest"><input type="text" value={volume.dest}
									                                          placeholder="Container Destination"
									                                          ref={`${ref}-dest`}
									                                          onChange={this.volumeOnChange.bind(this, 'dest', index)}/>
									</td>
									<td>
										<span className="icon icon-cancel-circled" onClick={this.removeVolume.bind(this, index)}></span>
									</td>
								</tr>
							})
						}
						<tr>
							<td><input type="text" id="add-host-source" placeholder="Add Host Source"
							           onKeyDown={this.newVolumeKeyDown}/></td>
							<td><input type="text" id="add-container-dest" placeholder="Add Container Destination"
							           onKeyDown={this.newVolumeKeyDown}/></td>
							<td style={{pointerEvents: 'none', opacity: '0'}}>
								<span className="icon icon-cancel-circled"></span>
							</td>
						</tr>
						</tbody>
					</table>
				</div>
			);

		}
	}

};