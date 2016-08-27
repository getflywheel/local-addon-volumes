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
						path: containerInfo.path,
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
					volumes: volumes
				});
			}
		}, {
			key: 'render',
			value: function render() {
				var _this4 = this;

				return React.createElement(
					'div',
					null,
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
								)
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
											onChange: _this4.volumeOnChange.bind(_this4, 'source', index) })
									),
									React.createElement(
										'td',
										{ className: 'volumes-table-dest' },
										React.createElement('input', { type: 'text', value: volume.dest,
											placeholder: 'Container Destination',
											ref: ref + '-dest',
											onChange: _this4.volumeOnChange.bind(_this4, 'dest', index) })
									)
								);
							}),
							React.createElement(
								'tr',
								null,
								React.createElement(
									'td',
									null,
									React.createElement('input', { type: 'text', id: 'add-host-source', placeholder: 'Add Host Source',
										onKeyDown: this.newVolumeKeyDown })
								),
								React.createElement(
									'td',
									null,
									React.createElement('input', { type: 'text', id: 'add-container-dest', placeholder: 'Add Container Destination',
										onKeyDown: this.newVolumeKeyDown })
								)
							)
						)
					)
				);
			}
		}]);

		return SiteInfoVolumes;
	}(Component);
};