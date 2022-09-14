/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

module.exports = exports = {
	state: {
		/**
		 * Collection of arguments
		 */
		zArguments: {}
	},
	getters: {
		getZarguments: function ( state ) {
			return state.zArguments;
		},
		// TODO(T299031): cleanup this code to be more performant
		/**
		 * Returns an array of objects with key and type of the available arguments.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @param {Object} rootGetters
		 * @return {Array}
		 */
		getZargumentsArray: function ( state, getters, rootState, rootGetters ) {
			/**
			 * @param {string} zlang
			 * @return {Array}
			 */
			return function ( zlang ) {
				var lang = zlang || rootGetters.getCurrentZLanguage;
				return Object.keys( getters.getZarguments )
					.map( function ( key ) {
						return {
							zid: getters.getZarguments[ key ].zid,
							type: getters.getZarguments[ key ].type,
							label: ( getters.getZarguments[ key ].labels.filter( function ( label ) {
								return label.lang === lang;
							} )[ 0 ] || { label: '' } ).label
						};
					} );
			};
		}
		// TODO(T299031): cleanup this code to be more performant
	},
	mutations: {
		/**
		 * Add a specific argument to the zArgument object.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.zid
		 */
		addZArgumentInfo: function ( state, payload ) {
			Vue.set( state.zArguments, payload.zid, payload );
		},
		/**
		 * Reset the zArguments object in the state
		 *
		 * @param {Object} state
		 */
		resetZArgumentInfo: function ( state ) {
			state.zArguments = {};
		}
	},
	actions: {
		/**
		 * reset and repopulate the zArguments in the store. This method also
		 * fetches any missing types.
		 *
		 * @param {Object} context
		 * @param {Object} zFunctionId
		 */
		setAvailableZArguments: function ( context, zFunctionId ) {
			context.commit( 'resetZArgumentInfo' );

			if ( context.getters.getCurrentZObjectId === zFunctionId ||
					context.getters.getZkeys[ zFunctionId ] ) {
				var zobject,
					missingTypes = [];

				if ( !context.getters.getZObjectAsJson ) {
					return;
				}

				if ( context.getters.getCurrentZObjectId === zFunctionId ) {
					zobject = canonicalize(
						JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
					);
				} else {
					// "JSON.parse( JSON.stringify() )" is to prevent zobject from updating Zkeys state when reassigned.
					zobject = JSON.parse( JSON.stringify( context.getters.getZkeys[ zFunctionId ] ) );
				}

				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] ) {
					return;
				}

				var zArguments = zobject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_ARGUMENTS ];

				// Remove argument type
				zArguments.shift();

				zArguments.forEach( function ( argument ) {
					var argumentLabels = argument[ Constants.Z_ARGUMENT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ];
					// Remove argument label type
					argumentLabels.shift();

					var labels = argumentLabels.map( function ( label ) {
							return {
								lang: label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_STRING_VALUE ] ||
									label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ],
								label: label[ Constants.Z_MONOLINGUALSTRING_VALUE ],
								key: label[ Constants.Z_MONOLINGUALSTRING_VALUE ] + ': '
							};
						} ),
						zid = argument[ Constants.Z_ARGUMENT_KEY ],
						typeZid,
						typeLabel;

					// We can either return an object or a straight string.
					if ( typeof argument[ Constants.Z_ARGUMENT_TYPE ] === 'object' ) {
						typeZid = argument[ Constants.Z_ARGUMENT_TYPE ][ Constants.Z_OBJECT_TYPE ];
						typeLabel = context.getters.getZkeyLabels[ typeZid ];
					} else {
						typeZid = argument[ Constants.Z_ARGUMENT_TYPE ];
						typeLabel = context.getters.getZkeyLabels[ typeZid ];
					}

					if ( typeof zid === 'object' ) {
						zid = zid[ Constants.Z_STRING_VALUE ];
					}
					if ( !typeLabel ) {
						missingTypes.push( argument[ Constants.Z_ARGUMENT_TYPE ] );
					}

					context.commit( 'addZArgumentInfo', {
						zid: zid,
						type: {
							label: typeLabel,
							zid: typeZid
						},
						labels: labels
					} );
				} );

				// If any argument types are not available, fetch them and rerun the function
				if ( missingTypes.filter( Boolean ).length ) {
					context.dispatch( 'fetchZKeys', { zids: missingTypes } ).then( function () {
						context.dispatch( 'setAvailableZArguments', zFunctionId );
					} );
				}
			}
		}
	}
};
