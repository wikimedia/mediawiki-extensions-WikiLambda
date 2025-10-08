/*!
 * WikiLambda Pinia store to manipulate the state of the current page.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../Constants.js' );
const eventLogUtils = require( '../../../utils/eventLogUtils.js' );
const { canonicalToHybrid } = require( '../../../utils/schemata.js' );
const { isTruthyOrEqual } = require( '../../../utils/typeUtils.js' );

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
			// sending the 'change' event for the first change
			if ( value === true && !this.isDirty ) {
				const interactionData = {
					zobjectid: this.getCurrentZObjectId,
					zobjecttype: this.getCurrentZObjectType || null,
					implementationtype: this.getCurrentZImplementationType || null,
					zlang: this.getUserLangZid || null
				};
				// Submit interaction event via eventLogUtils
				eventLogUtils.submitInteraction( 'change', interactionData );
			}
			this.dirty = value;
		},

		/**
		 * Save initial multilingual data values so that the
		 * About widget can reset everything to its original
		 * state in the case of an edit cancelation.
		 *
		 * NOTE: Objects are stored in canonical form. We pass
		 * the canonical object as input, because the root object
		 * might not be set in the store. This is okay because we
		 * only save the multilingual data copy on initialization.
		 *
		 * @param {Object} zobject
		 */
		saveMultilingualDataCopy: function ( zobject ) {
			const inputLabels = [];

			const path = [ Constants.Z_PERSISTENTOBJECT_VALUE, Constants.Z_OBJECT_TYPE ];
			if ( isTruthyOrEqual( zobject, path, Constants.Z_FUNCTION ) ) {
				const inputs = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ]
					.slice( 1 );
				// We create an array of input labels, ignoring benjaming item
				inputLabels.push( ...inputs.map( ( arg ) => arg[ Constants.Z_ARGUMENT_LABEL ] ) );
			}

			this.multilingualDataCopy = {
				names: zobject[ Constants.Z_PERSISTENTOBJECT_LABEL ],
				descriptions: zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ],
				aliases: zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ],
				inputs: inputLabels
			};
		},

		/**
		 * Resets the initial state of the multilingual
		 * data of the current object.
		 */
		resetMultilingualData: function () {
			const initialData = this.getMultilingualDataCopy;

			this.setValueByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				],
				value: canonicalToHybrid( initialData.names )
			} );

			this.setValueByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION
				],
				value: canonicalToHybrid( initialData.descriptions )
			} );

			this.setValueByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES
				],
				value: canonicalToHybrid( initialData.aliases )
			} );

			if ( this.getCurrentZObjectType === Constants.Z_FUNCTION && Array.isArray( initialData.inputs ) ) {
				initialData.inputs.forEach( ( labelData, index ) => {
					const keyPath = [
						Constants.STORED_OBJECTS.MAIN,
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_FUNCTION_ARGUMENTS,
						index + 1,
						Constants.Z_ARGUMENT_LABEL
					];
					this.setValueByKeyPath( {
						keyPath,
						value: canonicalToHybrid( labelData )
					} );
				} );
			}
		}
	}
};
