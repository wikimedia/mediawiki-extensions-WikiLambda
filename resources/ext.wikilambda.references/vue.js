/*!
 * WikiLambda references: Vue app initialization
 * Lazy-loaded when a reference is interacted with.
 *
 * @module ext.wikilambda.references.vue
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createMwApp } = require( 'vue' );
const ReferenceManager = require( './components/reference/ReferenceManager.vue' );

let instance = null;

/**
 * Get or create Vue app instance
 *
 * @memberof module:ext.wikilambda.references.vue
 * @return {Object} Vue component instance
 */
function getInstance() {
	if ( instance ) {
		return instance;
	}

	const mountNode = document.createElement( 'div' );
	mountNode.className = 'ext-wikilambda-references-root';
	document.body.appendChild( mountNode );

	const app = createMwApp( ReferenceManager );
	instance = app.mount( mountNode );

	return instance;
}

module.exports = {
	handleMouseenter: ( button ) => getInstance().handleMouseenter( button ),
	handleMouseleave: () => getInstance().handleMouseleave(),
	handleClick: ( button ) => getInstance().handleClick( button )
};
