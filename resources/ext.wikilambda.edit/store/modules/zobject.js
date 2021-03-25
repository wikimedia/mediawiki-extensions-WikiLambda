var Constants = require( '../../Constants.js' );

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
				zobject[ Constants.Z_PERSISTENTOBJECT_ID ] = editingData.title;
			}

			context.commit( 'setCreateNewPage', createNewPage );
			context.commit( 'setZObject', zobject );
		},
		submitZObject: function ( context, summary ) {
			var page = mw.config.get( 'wgWikiLambda' ).page,
				api = new mw.Api(),
				createNewPage = context.getters.isCreateNewPage,
				zobject = context.getters.getCurrentZObject;

			if ( createNewPage ) {
				// TODO: If the page already exists, increment the counter until we get a free one.
				api.create( page, { summary: summary },
					JSON.stringify( zobject )
				).then( function () {
					window.location.href = new mw.Title( page ).getUrl();
				} ).catch( function ( errorCode, result ) {
					context.commit( 'setMessage', {
						type: 'error',
						text: result.error.info
					} );
				} );
			} else {
				api.edit( page, function ( /* revision */ ) {
					return {
						text: JSON.stringify( zobject ),
						summary: summary
					};
				} ).then( function () {
					window.location.href = new mw.Title( page ).getUrl();
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
