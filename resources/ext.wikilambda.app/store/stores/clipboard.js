/*!
 * WikiLambda Vue editor: Pinia store for frontend clipboard feature
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { extractZIDs } = require( '../../utils/schemata.js' );
const { tryJsonParse } = require( '../../utils/miscUtils.js' );
const { getScaffolding } = require( '../../utils/typeUtils.js' );
const { getZObjectType, getZArgumentReferenceTerminalValue } = require( '../../utils/zobjectUtils.js' );

const STORAGE_KEY = 'ext-wikilambda-app-clipboard';

module.exports = {
	state: {
		clipboardItems: []
	},

	getters: {
		getClipboardItems: function ( state ) {
			return state.clipboardItems;
		}
	},

	actions: {
		/**
		 * Initializes the clipboard store with the content saved in mw.storage
		 * and creates an event listener to keep the storage updated across tabs.
		 * This action should be run once in the app, so it will be called from the
		 * initializeView action called in the App.vue component, on mount.
		 */
		initializeClipboard: function () {
			// Initialize Pinia store with mw.storage clipboard
			const storedClipboard = tryJsonParse( mw.storage.get( STORAGE_KEY ) );
			this.clipboardItems = storedClipboard || [];

			const zids = extractZIDs( storedClipboard );
			this.fetchZids( { zids } );

			// Add event listener to update other tabs in real time
			window.addEventListener( 'storage', ( event ) => {
				if ( event.key === STORAGE_KEY ) {
					this.clipboardItems = tryJsonParse( event.newValue ) || [];
					const moreZids = extractZIDs( this.clipboardItems );
					this.fetchZids( { zids: moreZids } );
				}
			} );
		},
		/**
		 * Store a zobject fragment in the zobject block clipboard, which has a Pinia store
		 * module and is also persisted in the local storage using the mediawiki.storage module.
		 *
		 * @param {Object} payload
		 * @param {string|undefined} payload.originKey - key from copy action, for naming
		 * @param {Object|string|undefined} payload.originSlotType - expected type, in canonical form
		 * @param {Object|string|undefined} payload.value - zobject block to copy, in hybrid form
		 */
		copyToClipboard: function ( payload ) {
			const { originKey, originSlotType } = payload;
			const value = JSON.parse( JSON.stringify( payload.value ) );

			const objectType = getZObjectType( value );
			const resolvingType = this.getResolvingType( value );
			const zids = extractZIDs( resolvingType );
			this.fetchZids( { zids } );

			// For the item id, get the label of the key and assign a number.
			const keyLabel = this.getLabelData( originKey ).label;
			const repeated = this.clipboardItems.filter( ( i ) => i.itemId.startsWith( `${ keyLabel }#` ) ).length;
			const itemId = `${ keyLabel }#${ repeated + 1 }`;

			const clipboardItem = {
				itemId,
				originKey,
				originSlotType,
				value,
				objectType,
				resolvingType
			};

			// Update Pinia store
			this.clipboardItems.push( clipboardItem );

			// Update mw.storage
			mw.storage.set( STORAGE_KEY, JSON.stringify( this.clipboardItems ) );
		},
		/**
		 * Clears the store and the data stored in the browser localStorage
		 */
		clearClipboard: function () {
			this.clipboardItems = [];
			mw.storage.set( STORAGE_KEY, JSON.stringify( [] ) );
		},
		/**
		 * Given a zobject fragment and a destination keyPath, it resets the
		 * argument reference objects so that the final object is always
		 * contextually valid:
		 * * If the destination keyPath belongs to a implementation composition
		 *   it keeps untouched all the argument references to the target function
		 *   arguments, and resets the rest to blank argument references.
		 * * If the destination keyPath belongs to an abstract fragment,
		 *   it keeps untouched all the Z825 argument references, and resets the
		 *   rest to blank argument references.
		 * * If the destination keyPath is not a composition or abstract fragment
		 *   it removes the Z18 objects.
		 *
		 * @param {Object | Array | string} initialValue - object to copy, in its hybrid form
		 * @param {string} destinationKeyPath
		 * @return {Object | Array | string}
		 */
		cleanClipboardItem: function ( initialValue, destinationKeyPath ) {
			/**
			 * Helper function: recursively resets argument reference objects of
			 * a given object value and given a destination context. The context
			 * object must contain two properties:
			 * * allowsArgs: true if the destination slot is a composition or an abstract fragment.
			 * * allowedArgs: with the argument reference keys that are allowed, if any.
			 *
			 * @param {Object | Array | string} value
			 * @param {Object} context
			 * @return {Object | Array | string}
			 */
			const resetContextArgRefs = ( value, context ) => {
				// Array: walk each item and reset
				if ( Array.isArray( value ) ) {
					return value.map( ( item ) => resetContextArgRefs( item, context ) );
				}

				// Object: make sure any argument references are contextually correct
				if ( value && typeof value === 'object' ) {

					// Type is argument reference; reset if needed
					const type = getZObjectType( value );
					if ( type === Constants.Z_ARGUMENT_REFERENCE ) {
						// If context does not allow arg references, return empty object
						if ( !context.allowsArgs ) {
							return getScaffolding( Constants.Z_OBJECT );
						}
						// If context allows arg references, reset to blank if the key doesn't
						// belong to the destination context, or leave intact if it does
						const key = getZArgumentReferenceTerminalValue( value );
						const copy = JSON.parse( JSON.stringify( value ) );
						if ( !context.allowedArgs.includes( key ) ) {
							copy[ Constants.Z_ARGUMENT_REFERENCE_KEY ] = getScaffolding( Constants.Z_STRING );
						}
						return copy;
					}

					// Not an argument reference; recurse over all keys
					const cleaned = {};
					Object.keys( value ).forEach( ( key ) => {
						cleaned[ key ] = resetContextArgRefs( value[ key ], context );
					} );

					return cleaned;
				}

				// Any other type: return untouched
				return value;
			};

			/**
			 * Helper function: gathers context properties given a destination key path
			 *
			 * @param {string} keyPath
			 * @return {Object}
			 */
			const getContextArgumentKeys = ( keyPath ) => {
				// If keyPath belongs to an implementation composition, the available
				// argument references are the arg keys of the selected target function.
				const isComposition = keyPath.split( '.' ).includes( Constants.Z_IMPLEMENTATION_COMPOSITION );
				if ( isComposition ) {
					const args = this.getInputsOfFunctionZid( this.getCurrentTargetFunctionZid );
					return {
						allowsArgs: true,
						allowedArgs: args.map( ( arg ) => arg[ Constants.Z_ARGUMENT_KEY ] )
					};
				}

				// If keyPath belongs to an abstract fragment, the available argument
				// references are the arguments of Z825/Abstract render function
				const isAbstractFragment = keyPath.split( '.' )[ 0 ] === Constants.STORED_OBJECTS.ABSTRACT;
				if ( isAbstractFragment ) {
					return {
						allowsArgs: true,
						allowedArgs: [
							Constants.Z_ABSTRACT_RENDER_FUNCTION_QID,
							Constants.Z_ABSTRACT_RENDER_FUNCTION_LANGUAGE,
							Constants.Z_ABSTRACT_RENDER_FUNCTION_DATE
						]
					};
				}

				// Else, argument keys not allowed
				return {
					allowsArgs: false,
					allowedArgs: []
				};
			};

			// Get array of arguments for the destination context
			const destinationContext = getContextArgumentKeys( destinationKeyPath );

			// Call internal reset function with context
			return resetContextArgRefs( initialValue, destinationContext );
		}
	}
};
