var canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
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
		createNewImplementation: function ( context ) {
			context.dispatch( 'initializeResultId', context.getters.getNextObjectId )
				.then( function ( resultId ) {

					context.commit( 'addNewImplementation', resultId );

					context.dispatch( 'injectZObject', {
						zobject: {
							Z1K1: 'Z2',
							Z2K1: 'Z0',
							Z2K2: {
								Z1K1: 'Z14',
								Z14K1: context.getters.getCurrentZObjectId,
								Z14K3: {
									Z1K1: 'Z16',
									Z16K1: {
										Z1K1: 'Z61',
										Z61K1: ''
									},
									Z16K2: ''
								}
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [
									{
										Z1K1: 'Z11',
										Z11K1: context.getters.getUserZlangZID,
										Z11K2: ''
									}
								]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [
									{
										Z1K1: 'Z31',
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
