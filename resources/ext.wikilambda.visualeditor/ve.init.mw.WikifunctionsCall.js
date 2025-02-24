/*!
 * WikiLambda extension's VisualEditor ContentEditable class for Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */
mw.loader.using( 'ext.wikilambda.visualeditor' ).then( () => {
	mw.libs.ve.targetLoader.addPlugin( () => {
		ve.init.mw.WikifunctionsCall = ve.init.mw.WikifunctionsCall || {};
		// eslint-disable-next-line no-jquery/no-done-fail
		ve.init.mw.WikifunctionsCall.vueAppLoaded = mw.loader.using( 'ext.wikilambda.app' )
			.done( () => {
				// Initialize Pinia store globally
				const Pinia = require( 'pinia' );
				const { useMainStore } = require( 'ext.wikilambda.app' );

				const pinia = Pinia.createPinia();
				const piniaStore = useMainStore( pinia );

				ve.init.mw.WikifunctionsCall.pinia = pinia;
				ve.init.mw.WikifunctionsCall.piniaStore = piniaStore;
			} );
	} );
} );
