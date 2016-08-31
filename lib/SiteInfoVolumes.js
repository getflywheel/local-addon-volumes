'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var path = require('path');

module.exports = function (context) {

	var Component = context.React.Component;
	var React = context.React;
	var $ = context.jQuery;
	var docker = context.docker;
	var remote = context.electron.remote;

	var dialog = remote.dialog;

	var pressmaticPath = remote.app.getAppPath();

	var siteData = remote.require(path.join(pressmaticPath, './helpers/site-data'));
	var startSite = remote.require(path.join(pressmaticPath, './main/actions-sites/startSite'));

	return function (_Component) {
		_inherits(SiteInfoVolumes, _Component);

		function SiteInfoVolumes(props) {
			_classCallCheck(this, SiteInfoVolumes);

			var _this = _possibleConstructorReturn(this, (SiteInfoVolumes.__proto__ || Object.getPrototypeOf(SiteInfoVolumes)).call(this, props));

			_this.state = {
				volumes: [],
				ports: [],
				path: null
			};

			_this.inspectContainer = _this.inspectContainer.bind(_this);
			_this.stylesheetPath = path.resolve(__dirname, '../style.css');
			_this.newVolumeKeyDown = _this.newVolumeKeyDown.bind(_this);
			_this.removeVolume = _this.removeVolume.bind(_this);
			_this.openFolderDialog = _this.openFolderDialog.bind(_this);
			_this.apply = _this.apply.bind(_this);
			return _this;
		}

		_createClass(SiteInfoVolumes, [{
			key: 'componentDidMount',
			value: function componentDidMount() {

				this.inspectContainer();
			}
		}, {
			key: 'inspectContainer',
			value: function inspectContainer() {
				var _this2 = this;

				var siteID = this.props.params.siteID;
				var site = this.props.sites[siteID];

				docker('inspect ' + site.container).then(function (stdout) {

					var parsedOutput = void 0;

					try {
						parsedOutput = JSON.parse(stdout);
					} catch (e) {
						console.error(e);
						return false;
					}

					var containerInfo = parsedOutput[0];
					var containerVolumes = [];
					var containerPorts = [];

					containerInfo.Mounts.forEach(function (mount) {
						containerVolumes.push({ source: mount.Source, dest: mount.Destination });
					});

					Object.keys(containerInfo.NetworkSettings.Ports).forEach(function (port) {

						var portInfo = containerInfo.NetworkSettings.Ports[port][0];

						containerPorts.push({ hostPort: portInfo.HostPort, containerPort: port.replace('/tcp', '') });
					});

					_this2.setState({
						path: containerInfo.Path,
						ports: containerPorts,
						volumes: containerVolumes
					});
				});
			}
		}, {
			key: 'newVolumeKeyDown',
			value: function newVolumeKeyDown(event) {
				var _this3 = this;

				var volumes = this.state.volumes;

				var target = event.target.id == 'add-host-source' ? 'source' : 'dest';
				var ref = Math.round(Math.random() * 1000);

				volumes.push({
					source: '',
					dest: '',
					ref: ref
				});

				event.target.value = '';

				this.setState({
					volumes: volumes
				}, function () {

					switch (target) {
						case 'source':
							_this3.refs[ref + '-source'].focus();
							break;

						case 'dest':
							_this3.refs[ref + '-dest'].focus();
							break;
					}
				});
			}
		}, {
			key: 'volumeOnChange',
			value: function volumeOnChange(input, index, event) {

				var volumes = this.state.volumes;

				volumes[index][input] = event.target.value;

				this.setState({
					volumes: volumes,
					isChanged: true
				});
			}
		}, {
			key: 'removeVolume',
			value: function removeVolume(index) {

				var choice = dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'question',
					buttons: ['Yes', 'No'],
					title: 'Confirm',
					message: 'Are you sure you want to remove this volume? This may cause your site to not function properly.'
				});

				if (choice !== 0) {
					return;
				}

				this.setState({
					volumes: this.state.volumes.filter(function (_, i) {
						return i !== index;
					}),
					isChanged: true
				});
			}
		}, {
			key: 'openFolderDialog',
			value: function openFolderDialog(index) {

				var dialogResult = dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['createDirectory', 'openDirectory', 'openFile'] });
				var volumes = this.state.volumes;

				if (dialogResult) {

					if (isNaN(index)) {

						volumes.push({
							source: dialogResult[0],
							dest: ''
						});
					} else {

						volumes[index].source = dialogResult[0];
					}

					this.setState({
						volumes: volumes,
						isChanged: true
					});
				}
			}
		}, {
			key: 'apply',
			value: function apply() {
				var _this4 = this;

				var siteID = this.props.params.siteID;
				var site = this.props.sites[siteID];
				var imageID = void 0;

				var choice = dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'question',
					buttons: ['Cancel', 'Re-map Volumes'],
					title: 'Confirm',
					message: 'Are you sure you want to re-map the volumes for this site? There may be inadvertent effects if volumes aren\'t mapped correctly.\n\nLast but not least, make sure you have an up-to-date backup.'
				});

				if (choice === 0) {
					return;
				}

				docker('commit ' + site.container).then(function (stdout) {

					imageID = stdout.trim();

					var portsStr = '';
					var volumeMappingsStr = '';

					_this4.state.ports.forEach(function (port) {
						portsStr += ' -p ' + port.hostPort + ':' + port.containerPort;
					});

					_this4.state.volumes.forEach(function (volume) {
						volumeMappingsStr += ' -v "' + volume.source + '":"' + volume.dest + '"';
					});

					docker('kill ' + site.container).then(function (stdout) {

						docker('run -itd ' + portsStr.trim() + ' ' + volumeMappingsStr.trim() + ' ' + imageID + ' ' + _this4.state.path).then(function (stdout) {

							var site = siteData.getSite(siteID);

							site.container = stdout.trim();

							if ('duplicateImage' in site) {
								if (typeof site.duplicateImage != 'string') {
									site.duplicateImage.push(imageID);
								} else {
									site.duplicateImage = [site.duplicateImage, imageID];
								}
							} else {
								site.duplicateImage = imageID;
							}

							siteData.updateSite(siteID, site);

							startSite(site);
						});
					});
				});
			}
		}, {
			key: 'render',
			value: function render() {
				var _this5 = this;

				return React.createElement(
					'div',
					{ className: 'volumes-container' },
					React.createElement('link', { rel: 'stylesheet', href: this.stylesheetPath }),
					React.createElement(
						'table',
						{ className: 'table-striped volumes-table' },
						React.createElement(
							'thead',
							null,
							React.createElement(
								'tr',
								null,
								React.createElement(
									'th',
									null,
									'Host Source'
								),
								React.createElement(
									'th',
									null,
									'Container Destination'
								),
								React.createElement('th', null)
							)
						),
						React.createElement(
							'tbody',
							null,
							this.state.volumes.map(function (volume, index) {
								var ref = 'ref' in volume ? volume.ref : volume.source + ':' + volume.dest;

								return React.createElement(
									'tr',
									{ key: index },
									React.createElement(
										'td',
										{ className: 'volumes-table-source' },
										React.createElement('input', { type: 'text', value: volume.source,
											placeholder: 'Host Source',
											ref: ref + '-source',
											onChange: _this5.volumeOnChange.bind(_this5, 'source', index) }),
										React.createElement('span', { className: 'icon icon-folder', onClick: _this5.openFolderDialog.bind(_this5, index) })
									),
									React.createElement(
										'td',
										{ className: 'volumes-table-dest' },
										React.createElement('input', { type: 'text', value: volume.dest,
											placeholder: 'Container Destination',
											ref: ref + '-dest',
											onChange: _this5.volumeOnChange.bind(_this5, 'dest', index) })
									),
									React.createElement(
										'td',
										null,
										React.createElement('span', { className: 'icon icon-cancel-circled',
											onClick: _this5.removeVolume.bind(_this5, index) })
									)
								);
							}),
							React.createElement(
								'tr',
								null,
								React.createElement(
									'td',
									{ className: 'volumes-table-source' },
									React.createElement('input', { type: 'text', id: 'add-host-source', placeholder: 'Add Host Source',
										onKeyDown: this.newVolumeKeyDown }),
									React.createElement('span', { className: 'icon icon-folder', onClick: this.openFolderDialog.bind(this, 'new') })
								),
								React.createElement(
									'td',
									{ className: 'volumes-table-dest' },
									React.createElement('input', { type: 'text', id: 'add-container-dest', placeholder: 'Add Container Destination',
										onKeyDown: this.newVolumeKeyDown })
								),
								React.createElement('td', null)
							)
						)
					),
					React.createElement(
						'div',
						{ className: 'form-actions' },
						React.createElement(
							'button',
							{ className: 'btn btn-form btn-primary btn-right', ref: 'apply', disabled: !this.state.isChanged, onClick: this.apply },
							'Apply'
						)
					)
				);
			}
		}]);

		return SiteInfoVolumes;
	}(Component);
};