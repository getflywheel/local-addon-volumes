'use strict';

const path = require('path');

module.exports = function(context) {

	const hooks = context.hooks;
	const React = context.React;
	const {Route} = context.ReactRouter;

	const SiteInfoVolumes = require('./SiteInfoVolumes')(context);

	hooks.addContent('routesSiteInfo', () => {
		return <Route key="site-info-stats" path="/site-info/:siteID/volumes" component={SiteInfoVolumes}/>
	});
	
	hooks.addFilter('siteInfoMoreMenu', function(menu, site) {
		
		menu.push({
			label: 'Volumes',
			enabled: !this.context.router.isActive(`/site-info/${site.id}/volumes`),
			click: () => {
				context.events.send('goToRoute', `/site-info/${site.id}/volumes`);
			}
		});

		return menu;

	});

};