/*!
 * WikiLambda Vuex code to manipulate the current ZObject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Constants = require( '../../../Constants.js' );
const eventLogUtils = require( '../../../mixins/eventLogUtils.js' );

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
			// T350497 Update Wikilambda instrument to use core interaction events
			// sending the 'change' event for the first change
			if ( value === true && !context.getters.isDirty ) {
				const interactionData = {
					zobjectid: context.getters.getCurrentZObjectId,
					zobjecttype: context.getters.getCurrentZObjectType || null,
					implementationtype: context.getters.getCurrentZImplementationType || null,
					zlang: context.getters.getUserLangZid || null
				};
				eventLogUtils.methods.submitInteraction( 'change', interactionData );
			}
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
			return rootGetters.getZObjectAsJsonById( 0, rootState.zobjectModule.zobject[ 0 ].isArray() );
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
		 * @return {string | Object | undefined} current ZObject Type
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
		 * Recursively waks a nested generic type and returns
		 * the field IDs and whether they are valid or not.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		validateGenericType: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @param {Object} fields
			 * @return {Object} fields
			 */
			function validate( rowId, fields = [] ) {
				// There's no need to convert to string as the
				// possible options will be either Z7 or Z9
				const mode = getters.getZObjectTypeByRowId( rowId );
				const value = ( mode === Constants.Z_REFERENCE ) ?
					getters.getZReferenceTerminalValue( rowId ) :
					getters.getZFunctionCallFunctionId( rowId );

				fields.push( {
					rowId,
					isValid: !!value
				} );

				if ( mode === Constants.Z_FUNCTION_CALL ) {
					const args = getters.getZFunctionCallArguments( rowId );
					for ( const arg of args ) {
						getters.validateGenericType( arg.id, fields );
					}
				}
				return fields;
			}
			return validate;
		},
		/**
		 * Returns the array of input-related field ids that are invalid.
		 * Ignores those inputs that have no label and fully empty type
		 * because it will be deleted before submission.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Array}
		 */
		currentZFunctionInvalidInputs: function ( _state, getters ) {
			const inputs = getters.getZFunctionInputs();
			let invalidRowIds = [];
			for ( const inputRow of inputs ) {
				// Get the validity state of all the type fields
				const inputTypeRow = getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				const inputTypeFields = getters.validateGenericType( inputTypeRow.id );

				// Get the values of the input labels
				const inputLabelsRow = getters.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], inputRow.id );
				const inputLabelRows = getters.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );
				const inputLabelValues = inputLabelRows
					.map( ( row ) => getters.getZMonolingualTextValue( row.id ) )
					.filter( ( text ) => !!text );

				// If type value is empty and fields are empty, ignore this input:
				// because it's totally empty, the input will be erased before submission.
				const inputTypeIsEmpty = ( inputTypeFields.filter( ( e ) => e.isValid ).length === 0 );
				if ( inputTypeIsEmpty && inputLabelValues.length === 0 ) {
					continue;
				}

				// Return errors to report
				const invalidInputRowIds = inputTypeFields.filter( ( e ) => !e.isValid ).map( ( e ) => e.rowId );
				invalidRowIds = invalidRowIds.concat( invalidInputRowIds );
			}
			return invalidRowIds;
		},
		/**
		 * Returns the array of output-related field ids that are invalid.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Array}
		 */
		currentZFunctionInvalidOutput: function ( _state, getters ) {
			const outputTypeRow = getters.getZFunctionOutput();
			const outputTypeFields = getters.validateGenericType( outputTypeRow.id );
			return outputTypeFields.filter( ( e ) => !e.isValid ).map( ( e ) => e.rowId );
		}
	}
};
