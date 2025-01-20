/*!
 * WikiLambda Pinia store to manipulate the state of the current page.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../Constants.js' );
const eventLogUtils = require( '../../../mixins/eventLogUtils.js' );

module.exports = {
	state: {
		currentZid: Constants.NEW_ZID_PLACEHOLDER,
		createNewPage: false,
		initialized: false,
		dirty: false,
		multilingualDataCopy: null
	},

	getters: {
		/**
		 * Returns whether the root ZObject is initialized
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isInitialized: function ( state ) {
			return state.initialized;
		},

		/**
		 * Returns whether we are creating a new page.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isCreateNewPage: function ( state ) {
			return state.createNewPage;
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
		 * @return {Function}
		 */
		isMainObject: function () {
			/**
			 * @param {string} rowId
			 * @return {boolean}
			 */
			const findOldestAncestor = ( rowId ) => {
				const row = this.getRowById( rowId );
				// Row doesn't exist, return false
				if ( row === undefined ) {
					return false;
				}
				// Row is oldest ancestor, return true if id is 0
				if ( row.parent === undefined ) {
					return ( row.id === 0 );
				}
				return findOldestAncestor( row.parent );
			};
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
		 * @return {string | Object | undefined} current ZObject Type
		 */
		getCurrentZObjectType: function () {
			return this.getZObjectTypeByRowId(
				this.getZPersistentContentRowId()
			);
		},

		/**
		 * Return the key indicating the content type of the current implementation:
		 * 'Z14K2' (composition), 'Z14K3' (code) or 'Z14K4' (builtin).
		 *
		 * @return {string | undefined} currentZImplementationContentType
		 */
		getCurrentZImplementationType: function () {
			return this.getZImplementationContentType(
				this.getZPersistentContentRowId()
			);
		}
	},

	actions: {
		/**
		 * Sets the flag state.initialized once the
		 * root zobject state has been initialized.
		 *
		 * @param {boolean} value
		 */
		setInitialized: function ( value ) {
			this.initialized = value;
		},

		/**
		 * Sets the state flag createNewPage, which reflects
		 * whether we are creating a new page.
		 *
		 * @param {boolean} payload
		 */
		setCreateNewPage: function ( payload ) {
			this.createNewPage = payload;
		},

		/**
		 * Set the value of the current Zid
		 *
		 * @param {string} currentZid
		 */
		setCurrentZid: function ( currentZid ) {
			this.currentZid = currentZid;
		},

		/**
		 * Sets the value of the isDirty flag,
		 * which is true if there's been any changes
		 * in the page that will need saving.
		 *
		 * @param {boolean} value
		 */
		setDirty: function ( value = true ) {
			// T350497 Update Wikilambda instrument to use core interaction events
			// sending the 'change' event for the first change
			if ( value === true && !this.isDirty ) {
				const interactionData = {
					zobjectid: this.getCurrentZObjectId,
					zobjecttype: this.getCurrentZObjectType || null,
					implementationtype: this.getCurrentZImplementationType || null,
					zlang: this.getUserLangZid || null
				};
				eventLogUtils.methods.submitInteraction( 'change', interactionData );
			}
			this.dirty = value;
		},

		/**
		 * Save initial multilingual data values
		 * so that About widget knows how to reset to original
		 * state in the case of a publish cancelation action.
		 *
		 * @param {Object} zobject
		 */
		saveMultilingualDataCopy: function ( zobject ) {
			this.multilingualDataCopy = {
				names: zobject[ Constants.Z_PERSISTENTOBJECT_LABEL ],
				descriptions: zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ],
				aliases: zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ]
			};
		},

		/**
		 * Resets the initial state of the multilingual
		 * data of the current object.
		 */
		resetMultilingualData: function () {
			const initialData = this.getMultilingualDataCopy;

			const nameRow = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_LABEL ], 0 );
			if ( nameRow ) {
				this.injectZObjectFromRowId( {
					rowId: nameRow.id,
					value: initialData.names
				} );
			}

			const descriptionRow = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ], 0 );
			if ( descriptionRow ) {
				this.injectZObjectFromRowId( {
					rowId: descriptionRow.id,
					value: initialData.descriptions
				} );
			}

			const aliasesRow = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_ALIASES ], 0 );
			if ( aliasesRow ) {
				this.injectZObjectFromRowId( {
					rowId: aliasesRow.id,
					value: initialData.aliases
				} );
			}
		}
	}
};
