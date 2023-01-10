/*!
 * WikiLambda Vuex code to manipulate the ZTesters of a ZFunction object.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	Constants = require( '../../Constants.js' ),
	saveZObject = require( '../../mixins/api.js' ).methods.saveZObject,
	typeUtils = require( '../../mixins/typeUtils.js' ).methods;

module.exports = exports = {
	state: {
		newTester: null,
		/**
		 * List of ZIDs for all testers (attached and unattached)
		 */
		zTesters: []
	},
	getters: {
		getNewTesterId: function ( state ) {
			return state.newTester;
		},
		getNewTesterZObjects: function ( state, getters ) {
			return getters.getZObjectAsJsonById( state.newTester );
		},
		getZTesters: function ( state ) {
			return state.zTesters;
		},
		getTestInputOutputByZIDs: function ( state, getters ) {
			/**
			 * @param {Array} zIDs
			 * @return {Array}
			 */
			return function ( zIDs ) {
				var inputOutput = [];
				for ( let index = 0; index < zIDs.length; index++ ) {
					const zid = zIDs[ index ];
					if ( getters.getZkeyLabels[ zid ] ) {
						const zObjectValue = getters.getZkeyLabels[ zid ].split( ' -> ' );
						inputOutput.push( {
							input: zObjectValue[ 0 ],
							output: zObjectValue[ 1 ]
						} );
					}
				}

				return inputOutput;
			};
		},
		getPaginatedTesters: function ( state, getters ) {
			return getters.paginateList( state.zTesters );
		}
	},
	mutations: {
		addNewTester: function ( state, newTester ) {
			state.newTester = newTester;
		},
		removeNewTester: function ( state ) {
			state.newTester = null;
		},
		/**
		 * Set the zTesters in the store
		 *
		 * @param {Object} state
		 * @param {Object} zTesters
		 */
		setZTesters: function ( state, zTesters ) {
			state.zTesters = zTesters;
		}
	},
	actions: {
		/**
		 * Triggers the fetch of all (attached and unattached) testers for the specified zFunctionId.
		 * Also fetches relevant zKeys
		 *
		 * Note that this stores a raw array, not a canonical ZList.
		 *
		 * @param {Object} context
		 * @param {string} zFunctionId
		 * @return {Promise}
		 */
		fetchZTesters: function ( context, zFunctionId ) {
			var api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: Constants.Z_TESTER,
				wikilambdafn_limit: Constants.API_LIMIT_MAX
			} ).then( function ( response ) {
				var zidList = response.query.wikilambdafn_search.map( function ( zidItem ) {
					return zidItem.zid;
				} );
				context.commit( 'setZTesters', zidList );
				return context.dispatch( 'fetchZKeys', { zids: zidList } );
			} );
		},
		/**
		 * Create a new instance of a tester. This is NOT attached to the main object, and used
		 * by the UI to support the user in creating a new tester.
		 * The object is given a parent of -1 to indicate that it is not attached to the main zObject
		 *
		 * @param {Object} context
		 */
		createNewTester: function ( context ) {
			context.dispatch( 'initializeResultId', context.getters.getNextObjectId )
				.then( function ( resultId ) {
					var returnType = context.getters.getZObjectAsJson[
							Constants.Z_PERSISTENTOBJECT_VALUE ][
							Constants.Z_FUNCTION_RETURN_TYPE ][
							Constants.Z_REFERENCE_ID ],
						defaultTestValidator = '';

					if ( returnType === Constants.Z_STRING ) {
						defaultTestValidator = Constants.Z_FUNCTION_STRING_EQUALITY;
					} else if ( returnType === Constants.Z_BOOLEAN ) {
						defaultTestValidator = Constants.Z_FUNCTION_BOOLEAN_EQUALITY;
					}

					context.commit( 'addNewTester', resultId );

					context.dispatch( 'injectZObject', {
						zobject: {
							Z1K1: Constants.Z_PERSISTENTOBJECT,
							Z2K1: Constants.NEW_ZID_PLACEHOLDER,
							Z2K2: {
								Z1K1: Constants.Z_TESTER,
								Z20K1: context.getters.getCurrentZObjectId,
								Z20K2: {
									Z1K1: Constants.Z_FUNCTION_CALL,
									Z7K1: context.getters.getCurrentZObjectId
								},
								Z20K3: {
									Z1K1: Constants.Z_FUNCTION_CALL,
									Z7K1: defaultTestValidator
								}
							},
							Z2K3: {
								Z1K1: Constants.Z_MULTILINGUALSTRING,
								Z12K1: [
									Constants.Z_MONOLINGUALSTRING,
									{
										Z1K1: Constants.Z_MONOLINGUALSTRING,
										Z11K1: context.getters.getUserZlangZID,
										Z11K2: ''
									}
								]
							},
							Z2K4: {
								Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
								Z32K1: [
									Constants.Z_MONOLINGUALSTRINGSET,
									{
										Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
										Z31K1: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
										Z31K2: []
									}
								]
							}
						},
						key: '',
						id: resultId,
						parent: -1
					} );
				} );
		},
		/**
		 * Generates the test summary label used in the UI.
		 * This string includes the input and expected output value.
		 * eg: [ input1, input2 ] -> true
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.testerId
		 */
		updateTesterLabel: function ( context, payload ) {
			var testerJson = canonicalize( context.getters.getZObjectAsJsonById( payload.testerId ) ).Z2K2,
				testerLabels = context.getters.getZObjectChildrenById(
					context.getters.getNestedZObjectById( payload.testerId, [
						Constants.Z_PERSISTENTOBJECT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					] ).id ),
				call = testerJson.Z20K2,
				validator = testerJson.Z20K3,
				validatorZid = validator.Z7K1,
				callInputs = '',
				validatorInputs = '',
				key,
				value;

			delete call.Z1K1;
			delete call.Z7K1;
			delete validator.Z1K1;
			delete validator.Z7K1;
			delete validator[ validatorZid + 'K1' ];

			for ( key in call ) {
				value = call[ key ];
				if ( !value ) {
					continue;
				}
				if ( callInputs.length ) {
					callInputs += ', ' + typeUtils.zObjectToString( value ).toString();
				} else {
					callInputs = typeUtils.zObjectToString( value ).toString();
				}
			}

			for ( key in validator ) {
				value = validator[ key ];
				if ( !value ) {
					continue;
				}
				if ( validatorInputs.length ) {
					validatorInputs += ', ' + typeUtils.zObjectToString( value ).toString();
				} else {
					validatorInputs = typeUtils.zObjectToString( value ).toString();
				}
			}

			testerLabels.forEach( function ( labelObject ) {
				var labelString = context.getters.getNestedZObjectById( labelObject.id, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );

				context.dispatch( 'setZObjectValue', {
					id: labelString.id,
					value: callInputs + ' -> ' + validatorInputs
				} );
			} );
		},
		/**
		 * This method will take the provisional testers (the one created using createNewTester )
		 * and create a new zObject from it. It then attached the newly create zId as a tester
		 * to the current zObject.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.testerId
		 * @param {number} payload.nextTesterIndex
		 */
		saveNewTester: function ( context, payload ) {
			var zobject = canonicalize( context.getters.getZObjectAsJsonById( payload.testerId ) ),
				newZid;

			saveZObject( zobject ).then( function ( result ) {
				newZid = result.title;
				return context.dispatch( 'fetchZTesters', context.getters.getCurrentZObjectId );
			} ).then( function () {
				var nextId = context.getters.getNextObjectId;

				context.dispatch( 'addZObject', {
					key: payload.nextTesterIndex,
					value: 'object',
					parent: payload.parent
				} );
				context.dispatch( 'addZReference', {
					value: newZid,
					id: nextId
				} );

				context.dispatch( 'removeZObjectChildren', payload.testerId );
				context.dispatch( 'removeZObject', payload.testerId );
				context.commit( 'removeNewTester' );
			} );
		}
	}
};
