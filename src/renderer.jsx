import React from 'react';
import SiteInfoVolumes from './SiteInfoVolumes';

export default function (context) {

	const hooks = context.hooks;
	const { Route } = context.ReactRouter;

	hooks.addContent('routesSiteInfo', () => <Route key="site-info-volumes" path="/site-info/:siteID/volumes"
		render={(props) => <SiteInfoVolumes {...props} sendEvent={context.events.send} docker={context.docker.docker}/>} notifier={context.notifier} />);

	hooks.addFilter('siteInfoMoreMenu', function (menu, site) {

		menu.push({
			label: 'Volumes',
			enabled: !this.context.router.isActive(`/site-info/${site.id}/volumes`),
			click: () => {
				context.events.send('goToRoute', `/site-info/${site.id}/volumes`);
			},
		});

		return menu;

	});

}
