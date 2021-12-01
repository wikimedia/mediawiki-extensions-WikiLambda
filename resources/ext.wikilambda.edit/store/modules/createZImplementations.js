var Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	saveZObject = require( '../../mixins/api.js' ).methods.saveZObject;

module.exports = {
	state: {
		newImplementations: []
	},
	getters: {
		getNewImplementationIds: function ( state ) {
			return state.newImplementations;
		},
		getNewImplementationZObjects: function ( state, getters ) {
			return state.newImplementations.map( function ( id ) {
				return getters.getZObjectAsJsonById( id );
			} );
		}
	},
	mutations: {
		addNewImplementation: function ( state, newImplementation ) {
			state.newImplementations.push( newImplementation );
		},
		removeNewImplementation: function ( state, id ) {
			state.newImplementations.splice( state.newImplementations.indexOf( id ), 1 );
		}
	},
	actions: {
		/**
		 * Create a new instance of a implementation. This is NOT attached to the main object, and used
		 * by the UI to support the user in creating a new implementation.
		 * The object is given a parent of -1 to indicate that it is not attached to the main zObject
		 *
		 * @param {Object} context
		 */
		createNewImplementation: function ( context ) {
			context.dispatch( 'initializeResultId', context.getters.getNextObjectId )
				.then( function ( resultId ) {

					context.commit( 'addNewImplementation', resultId );

					context.dispatch( 'injectZObject', {
						zobject: {
							Z1K1: Constants.Z_PERSISTENTOBJECT,
							Z2K1: Constants.NEW_ZID_PLACEHOLDER,
							Z2K2: {
								Z1K1: Constants.Z_IMPLEMENTATION,
								Z14K1: context.getters.getCurrentZObjectId,
								Z14K2: {
									Z1K1: Constants.Z_FUNCTION_CALL,
									Z7K1: ''
								}
							},
							Z2K3: {
								Z1K1: Constants.Z_MULTILINGUALSTRING,
								Z12K1: [
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
									{
										Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
										Z31K1: context.getters.getUserZlangZID,
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
		 * This method will take the provisional implementation (the one created using createNewImplementation )
		 * and create a new zObject from it. It then attached the newly create zId as a implementation
		 * to the current zObject.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.implementationId
		 * @param {number} payload.nextImplementationIndex
		 *
		 * @return {Promise}
		 */
		saveNewImplementation: function ( context, payload ) {
			var zobject = canonicalize( context.getters.getZObjectAsJsonById( payload.implementationId ) ),
				newZid,
				programmingLanguageLabel = zobject.Z2K2.Z14K3 ?
					zobject.Z2K2.Z14K3.Z16K1.Z61K1 :
					'Composition';

			zobject.Z2K3.Z12K1[ 0 ].Z11K2 =
				context.getters.getZkeyLabels[ zobject.Z2K2.Z14K1 ] + ' ' +
				programmingLanguageLabel + ' ' +
				( Math.floor( Math.random() * 100 ) + 1 );

			return saveZObject( zobject ).then( function ( result ) {
				newZid = result.title;
				// eslint-disable-next-line compat/compat
				return Promise.all( [
					context.dispatch( 'fetchZKeys', [ newZid ] ),
					context.dispatch( 'fetchZImplementations', context.getters.getCurrentZObjectId )
				] );
			} ).then( function () {
				var nextId = context.getters.getNextObjectId;

				context.dispatch( 'addZObject', {
					key: payload.nextImplementationIndex,
					value: 'object',
					parent: payload.parent
				} );
				context.dispatch( 'addZReference', {
					value: newZid,
					id: nextId
				} );

				context.dispatch( 'removeZObjectChildren', payload.implementationId );
				context.dispatch( 'removeZObject', payload.implementationId );
				context.commit( 'removeNewImplementation', payload.implementationId );
			} );
		}
	}
};
