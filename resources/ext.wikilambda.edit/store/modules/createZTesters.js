var canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	Constants = require( '../../Constants.js' );

module.exports = {
	state: {
		newTesters: []
	},
	getters: {
		getNewTesterIds: function ( state ) {
			return state.newTesters;
		},
		getNewTesterZObjects: function ( state, getters ) {
			return state.newTesters.map( function ( id ) {
				return getters.getZObjectAsJsonById( id );
			} );
		}
	},
	mutations: {
		addNewTester: function ( state, newTester ) {
			state.newTesters.push( newTester );
		},
		removeNewTester: function ( state, id ) {
			state.newTesters.splice( state.newTesters.indexOf( id ), 1 );
		}
	},
	actions: {
		createNewTester: function ( context ) {
			context.dispatch( 'initializeResultId', context.getters.getNextObjectId )
				.then( function ( resultId ) {
					var returnType = context.getters.getZObjectAsJson[
							Constants.Z_PERSISTENTOBJECT_VALUE ][
							Constants.Z_FUNCTION_RETURN_TYPE ][
							Constants.Z_REFERENCE_ID ],
						defaultTestValidator = '';

					if ( returnType === Constants.Z_STRING ) {
						defaultTestValidator = 'Z866';
					} else if ( returnType === Constants.Z_BOOLEAN ) {
						defaultTestValidator = 'Z844';
					}

					context.commit( 'addNewTester', resultId );

					context.dispatch( 'injectZObject', {
						zobject: {
							Z1K1: 'Z2',
							Z2K1: 'Z0',
							Z2K2: {
								Z1K1: 'Z20',
								Z20K1: context.getters.getCurrentZObjectId,
								Z20K2: {
									Z1K1: 'Z7',
									Z7K1: context.getters.getCurrentZObjectId
								},
								Z20K3: {
									Z1K1: 'Z7',
									Z7K1: defaultTestValidator
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
										Z31K1: 'Z1002',
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
		saveNewTester: function ( context, payload ) {
			var api = new mw.Api(),
				action = 'wikilambda_edit',
				zobject = canonicalize( context.getters.getZObjectAsJsonById( payload.testerId ) ),
				newZid;

			// TODO: Re-use the code in zobject.submitZObject(), having that emit a Promise rather than change page?
			api.postWithEditToken( {
				action: action,
				// TODO: i18n (and maybe specify the target function, and/or add the user's label for it?)
				summary: 'New tester',
				zid: undefined,
				zobject: JSON.stringify( zobject )
			} ).then( function ( result ) {
				newZid = result.wikilambda_edit.title;
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
				context.commit( 'removeNewTester', payload.testerId );
			} );
		}
	}
};
