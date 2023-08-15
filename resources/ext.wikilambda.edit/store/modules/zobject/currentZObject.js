/*!
 * WikiLambda Vuex code to manipulate the current ZObject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../../Constants.js' );

module.exports = exports = {
	state: {
		currentZid: Constants.NEW_ZID_PLACEHOLDER,
		dirty: false,
		multilingualDataCopy: null
	},
	mutations: {
		/**
		 * Set the value of the current Zid
		 *
		 * @param {Object} state
		 * @param {string} currentZid
		 */
		setCurrentZid: function ( state, currentZid ) {
			state.currentZid = currentZid;
		},
		/**
		 * Sets the value of the isDirty flag,
		 * which is true if there's been any changes
		 * in the page that will need saving.
		 *
		 * @param {Object} state
		 * @param {boolean} value
		 */
		setDirty: function ( state, value ) {
			state.dirty = value;
		},
		/**
		 * Save initial multilingual data values
		 * so that About widget knows how to reset to original
		 * state in the case of a publish cancelation action.
		 *
		 * @param {Object} state
		 * @param {Object} zobject
		 */
		saveMultilingualDataCopy: function ( state, zobject ) {
			state.multilingualDataCopy = {
				names: zobject[ Constants.Z_PERSISTENTOBJECT_LABEL ],
				descriptions: zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ],
				aliases: zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ]
			};
		}
	},
	actions: {
		/**
		 * Sets the value of the isDirty flag,
		 * which is true if there's been any changes
		 * in the page that will need saving.
		 *
		 * @param {Object} context
		 * @param {boolean} value
		 */
		setDirty: function ( context, value = true ) {
			context.commit( 'setDirty', value );
		},
		/**
		 * Resets the initial state of the multilingual
		 * data of the current object.
		 *
		 * @param {Object} context
		 */
		resetMultilingualData: function ( context ) {
			const initialData = context.getters.getMultilingualDataCopy;

			const nameRow = context.getters.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_LABEL ], 0 );
			if ( nameRow ) {
				context.dispatch( 'injectZObjectFromRowId', {
					rowId: nameRow.id,
					value: initialData.names
				} );
			}

			const descriptionRow = context.getters.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ], 0 );
			if ( descriptionRow ) {
				context.dispatch( 'injectZObjectFromRowId', {
					rowId: descriptionRow.id,
					value: initialData.descriptions
				} );
			}

			const aliasesRow = context.getters.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_ALIASES ], 0 );
			if ( aliasesRow ) {
				context.dispatch( 'injectZObjectFromRowId', {
					rowId: aliasesRow.id,
					value: initialData.aliases
				} );
			}
		}
	},
	getters: {
		/**
		 * Return whether the page is creating a new ZObject
		 * or is instead editing an already persisted one.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {boolean} is new ZObject page
		 */
		isNewZObject: function ( state, getters ) {
			return getters.getCurrentZObjectId === Constants.NEW_ZID_PLACEHOLDER;
		},
		/**
		 * Returns whether the page has had any
		 * changes that need saving.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isDirty: function ( state ) {
			return state.dirty;
		},
		/**
		 * Whether the given rowId is part of the main
		 * page object or is a detached object. If the
		 * oldest ancestor is row Id 0, then this is the
		 * main object.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {boolean}
		 */
		isMainObject: function ( state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {boolean}
			 */
			function findOldestAncestor( rowId ) {
				const row = getters.getRowById( rowId );
				// Row doesn't exist, return false
				if ( row === undefined ) {
					return false;
				}
				// Row is oldest ancestor, return true if id is 0
				if ( row.parent === undefined ) {
					return ( row.id === 0 );
				}
				return findOldestAncestor( row.parent );
			}
			return findOldestAncestor;
		},
		/**
		 * Returns the multilingual data initial copy
		 * saved on initialization
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getMultilingualDataCopy: function ( state ) {
			return state.multilingualDataCopy;
		},
		/**
		 * Return the complete zObject as a JSON
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @param {Object} rootGetters
		 * @return {Array} zObjectJson
		 */
		getZObjectAsJson: function ( state, getters, rootState, rootGetters ) {
			return rootGetters.getZObjectAsJsonById( 0, rootState.zobjectModule.zobject[ 0 ].value === 'array' );
		},
		/**
		 * Return the root ZObjectId, equivalend to the Z_REFERENCE_ID of Z_PERSISTENTOBJECT_ID
		 *
		 * @param {Object} state
		 * @return {string} currentZObjectId
		 */
		getCurrentZObjectId: function ( state ) {
			return state.currentZid || Constants.NEW_ZID_PLACEHOLDER;
		},
		/**
		 * Return the type of the root ZObject or undefined
		 * if it's still not set
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string | undefined} current ZObject Type
		 */
		getCurrentZObjectType: function ( state, getters ) {
			return getters.getZObjectTypeByRowId(
				getters.getZPersistentContentRowId()
			);
		},
		/**
		 * Return the key indicating the content type of the current implementation:
		 * 'Z14K2' (composition), 'Z14K3' (code) or 'Z14K4' (builtin).
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string | undefined} currentZImplementationContentType
		 */
		getCurrentZImplementationType: function ( state, getters ) {
			return getters.getZImplementationContentType(
				getters.getZPersistentContentRowId()
			);
		},
		/**
		 * Returns the array of inputs that are invalid. An invalid
		 * input has set labels but unset type
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Array}
		 */
		currentZFunctionInvalidInputs: function ( state, getters ) {
			const inputs = getters.getZFunctionInputs();
			const invalidRows = [];
			for ( const inputRow of inputs ) {
				// Get the value of the input type
				const inputTypeRow = getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				const inputTypeValue = getters.getZReferenceTerminalValue( inputTypeRow.id );

				// If the type is unset
				if ( inputTypeValue === undefined ) {
					// Get the value of input labels
					const inputLabelsRow = getters.getRowByKeyPath( [
						Constants.Z_ARGUMENT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					], inputRow.id );
					const inputLabelRows = getters.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );
					const inputLabelValues = inputLabelRows
						.map( ( row ) => getters.getZMonolingualTextValue( row.id ) )
						.filter( ( text ) => !!text );

					// If the type is unset but the labels are set, mark as invalid
					if ( inputLabelValues.length > 0 ) {
						invalidRows.push( {
							inputRow: inputRow,
							typeRow: inputTypeRow
						} );
					}
				}
			}
			return invalidRows;
		},

		currentZFunctionHasOutput: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;
			return zobject &&
				!!zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ][ Constants.Z_REFERENCE_ID ];
		},
		currentZFunctionHasTesters: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_TESTERS ].length > 0;
		},
		currentZFunctionHasImplementations: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_IMPLEMENTATIONS ].length > 0;
		}
	}
};
