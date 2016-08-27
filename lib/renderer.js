'use strict';

var path = require('path');

module.exports = function (context) {

	var hooks = context.hooks;
	var React = context.React;
	var Route = context.ReactRouter.Route;


	var SiteInfoVolumes = require('./SiteInfoVolumes')(context);

	hooks.addContent('routesSiteInfo', function () {
		return React.createElement(Route, { key: 'site-info-stats', path: '/site-info/:siteID/volumes', component: SiteInfoVolumes });
	});

	hooks.addFilter('siteInfoMoreMenu', function (menu, site) {

		menu.push({
			label: 'Volumes',
			enabled: !this.context.router.isActive('/site-info/' + site.id + '/volumes'),
			click: function click() {
				context.events.send('goToRoute', '/site-info/' + site.id + '/volumes');
			}
		});

		return menu;
	});
};