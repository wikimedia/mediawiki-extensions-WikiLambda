/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../../Constants.js' );

function findLatestKey( zobject, foundKey ) {
	var nextKey = foundKey || 0,
		potentialKey = null;

	Object.keys( zobject ).forEach( function ( key ) {
		if ( typeof zobject[ key ] === 'object' ) {
			potentialKey = findLatestKey( zobject[ key ], nextKey );
			if ( potentialKey > nextKey ) {
				nextKey = potentialKey;
			}
		} else {
			if ( zobject[ key ].indexOf( 'Z0K' ) >= 0 ) {
				potentialKey = zobject[ key ].replace( 'Z0K', '' );
				if ( potentialKey > nextKey ) {
					nextKey = potentialKey;
				}
			}
		}
	} );

	return parseInt( nextKey, 10 );
}

module.exports = {
	state: {
		zobject: {},
		createNewPage: true,
		zobjectMessage: {
			type: 'error',
			text: null
		}
	},
	getters: {
		getCurrentZObject: function ( state ) {
			return state.zobject;
		},
		isCreateNewPage: function ( state ) {
			return state.createNewPage;
		},
		getZObjectMessage: function ( state ) {
			return state.zobjectMessage;
		},
		getNextKey: function ( state ) {
			return findLatestKey( state.zobject ) + 1;
		}
	},
	mutations: {
		setZObject: function ( state, payload ) {
			state.zobject = payload;
		},
		setCreateNewPage: function ( state, payload ) {
			state.createNewPage = payload;
		},
		setMessage: function ( state, payload ) {
			state.zobjectMessage = {
				type: payload.type || 'notice',
				text: payload.text || null
			};
		}
	},
	actions: {
		initializeZObject: function ( context ) {
			var editingData = mw.config.get( 'wgWikiLambda' ),
				createNewPage = editingData.createNewPage,
				zobject = editingData.zobject;

			if ( createNewPage ) {
				zobject[ Constants.Z_PERSISTENTOBJECT_ID ] = Constants.NEW_ZID_PLACEHOLDER;
			}

			context.commit( 'setCreateNewPage', createNewPage );
			context.commit( 'setZObject', zobject );
		},
		submitZObject: function ( context, summary ) {
			var api = new mw.Api(),
				action = 'wikilambda_edit',
				createNewPage = context.getters.isCreateNewPage,
				zobject = context.getters.getCurrentZObject;

			if ( createNewPage ) {
				// TODO: If the page already exists, increment the counter until we get a free one.
				api.post( {
					action: action,
					summary: summary,
					zobject: JSON.stringify( zobject )
				} ).then( function ( result ) {
					window.location.href = new mw.Title( result[ action ].page ).getUrl();
				} ).catch( function ( errorCode, result ) {
					context.commit( 'setMessage', {
						type: 'error',
						text: result.error.info
					} );
				} );
			} else {
				api.post( {
					action: action,
					summary: summary,
					zid: zobject[ Constants.Z_PERSISTENTOBJECT_ID ],
					zobject: JSON.stringify( zobject )
				} ).then( function ( result ) {
					window.location.href = new mw.Title( result[ action ].page ).getUrl();
				} ).catch( function ( errorCode, result ) {
					context.commit( 'setMessage', {
						type: 'error',
						text: result.error.info
					} );
				} );
			}
		}
	}
};
