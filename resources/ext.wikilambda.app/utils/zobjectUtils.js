/*!
 * WikiLambda Vue ZObject handling utilities.
 *
 * This contains methods to navigate a ZObject passed as input through their keys and
 * values. Those functions that are commonly used for read operations on the ZObject
 * persisted in the store are also added in the zobjectMixin.
 *
 * These methods can be used with canonical and hybrid form, so that they can
 * be safely used for zobjects fetched and stored in the library (which are
 * in canonical form) and for the root ZObject represented in the page (which
 * is in hybrid form). Tests must reflect this by testing all use cases in both
 * forms.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Constants = require( '../Constants.js' );
const { hybridToCanonical } = require( './schemata.js' );
const { isValidZidFormat, getScaffolding } = require( './typeUtils.js' );

const zobjectUtils = {
	/**
	 * Gets the type of a valid ZObject.
	 * The input object can be canonical or hybrid, so it
	 * converts to canonical first.
	 *
	 * @param {Object|Array|string} value
	 * @return {string|Object|undefined}
	 */
	getZObjectType: function ( value ) {
		// If value is a string; infer type from syntax
		if ( typeof value === 'string' ) {
			return isValidZidFormat( value ) ? Constants.Z_REFERENCE : Constants.Z_STRING;
		}

		let type;
		// If value is an Array; return typed list definition
		if ( Array.isArray( value ) ) {
			type = {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
				[ Constants.Z_TYPED_LIST_TYPE ]: hybridToCanonical( value[ 0 ] ) || Constants.Z_OBJECT
			};
		}

		// If value has a type key Z1K1; return value of Z1K1
		if ( !!value && Constants.Z_OBJECT_TYPE in value ) {
			type = hybridToCanonical( value[ Constants.Z_OBJECT_TYPE ] );
		}

		// If undefined or null or non-valid; return undefined
		return type || undefined;
	},

	/**
	 * Walks a nested zobject given an array of keys and returns a
	 * reference to the parent object and the last key from the path.
	 *
	 * This method is used to walk the zobject from the store in order
	 * to perform mutations.
	 *
	 * When navigating the path, it throws exceptions when it can't find
	 * the final target. While performing mutation actions, it is recommended
	 * to throw these exceptions, but while using it for getters, exceptions
	 * can be caught to return undefined or empty values.
	 *
	 * E.g. Given the path [ 'main', 'parent', 'key' ] and the following object:
	 * ```
	 * {
	 *   granduncle: { ... },
	 *   main: {
	 *     aunt: { ... },
	 *     parent: {
	 *       key: 'terminal value',
	 *       sibling: 'some sibling value'
	 *     }
	 *   }
	 * }
	 * ```
	 * Will return the final key "key" and the reference to the object:
	 * ```
	 * {
	 *   key: 'terminal value',
	 *   sibling: 'some sibling value'
	 * }
	 * ```
	 * To then mutate the terminal value for key, do:
	 * ```
	 * target[ finalKey ] = 'new value';
	 * ```
	 *
	 * @param {Object|Array} root
	 * @param {Array} keyPath
	 * @return {Object}
	 */
	resolveZObjectByKeyPath: function ( root, keyPath ) {
		if ( !Array.isArray( keyPath ) || keyPath.length === 0 ) {
			throw new Error( 'Unable to resolve key path: Key path must be a non-empty array' );
		}

		const lastKeyIndex = keyPath.length - 1;
		let target = root;

		for ( let i = 0; i < lastKeyIndex; i++ ) {
			const key = keyPath[ i ];
			if ( !( key in target ) || typeof target[ key ] !== 'object' || target[ key ] === null ) {
				throw new Error( `Unable to resolve key path: Key path points to a non-object at "${ key }"` );
			}
			target = target[ key ];
		}

		const finalKey = keyPath[ lastKeyIndex ];
		return { target, finalKey };
	},

	/**
	 * Returns the terminal value of a string object.
	 * Accepts both canonical and hybrid forms.
	 *
	 * @param {Object|string} value
	 * @return {string|undefined}
	 */
	getZStringTerminalValue: function ( value ) {
		return ( typeof value === 'object' ) ?
			value[ Constants.Z_STRING_VALUE ] :
			value;
	},

	/**
	 * Returns the terminal value of a reference object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object|string} value
	 * @return {string|undefined}
	 */
	getZReferenceTerminalValue: function ( value ) {
		if ( !value ) {
			return undefined;
		}
		return ( typeof value === 'object' ) ?
			value[ Constants.Z_REFERENCE_ID ] :
			value;
	},

	/**
	 * Returns the terminal text value of a monolingual string object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZMonolingualTextValue: function ( value ) {
		if ( !value || typeof value !== 'object' ) {
			return undefined;
		}
		const monoText = value[ Constants.Z_MONOLINGUALSTRING_VALUE ];
		return zobjectUtils.getZStringTerminalValue( monoText );
	},

	/**
	 * Returns the terminal language value of a monolingual string object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZMonolingualLangValue: function ( value ) {
		if ( !value || typeof value !== 'object' ) {
			return undefined;
		}
		const monoLang = value[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
		return zobjectUtils.getZLangTerminalValue( monoLang );
	},

	/**
	 * Returns the terminal value of a language object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object|string} value
	 * @return {string|undefined}
	 */
	getZLangTerminalValue: function ( value ) {
		if ( value && typeof value === 'object' && Constants.Z_NATURAL_LANGUAGE_ISO_CODE in value ) {
			const langCode = value[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ];
			return zobjectUtils.getZStringTerminalValue( langCode );
		}
		return zobjectUtils.getZReferenceTerminalValue( value );
	},

	/**
	 * Returns the terminal value of a boolean object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object|string} value
	 * @return {string|undefined}
	 */
	getZBooleanValue: function ( value ) {
		const boolId = ( value && typeof value === 'object' && Constants.Z_BOOLEAN_IDENTITY in value ) ?
			value[ Constants.Z_BOOLEAN_IDENTITY ] :
			value;
		return zobjectUtils.getZReferenceTerminalValue( boolId );
	},

	/**
	 * Returns the terminal value of a function call function (Z7K1),
	 * only when it's a direct reference.
	 *
	 * If nested flag is true, returns the terminal value by:
	 * * if Z7K1 has an argument reference, returns its terminal value
	 * * if Z7K1 has a function call, returns its terminal value recursively
	 *
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @param {boolean} nested
	 * @return {string|undefined}
	 */
	getZFunctionCallFunctionId: function ( value, nested = false ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_FUNCTION_CALL_FUNCTION in value ) ) {
			return undefined;
		}
		const field = value[ Constants.Z_FUNCTION_CALL_FUNCTION ];

		if ( typeof field === 'string' || ( Constants.Z_REFERENCE_ID in field ) ) {
			return zobjectUtils.getZReferenceTerminalValue( field );
		}

		// If nested flag is true:
		// return final value of argument reference or nested function call
		if ( nested ) {
			if ( Constants.Z_ARGUMENT_REFERENCE_KEY in field ) {
				return zobjectUtils.getZArgumentReferenceTerminalValue( field );
			}
			if ( Constants.Z_FUNCTION_CALL_FUNCTION in field ) {
				return zobjectUtils.getZFunctionCallFunctionId( field, true );
			}
		}

		return undefined;
	},

	/**
	 * Returns an array with the input keys given a function call.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {Array}
	 */
	getZFunctionCallArgumentKeys: function ( value ) {
		const excludedKeys = [ Constants.Z_OBJECT_TYPE, Constants.Z_FUNCTION_CALL_FUNCTION ];
		return ( value && typeof value === 'object' && Constants.Z_FUNCTION_CALL_FUNCTION in value ) ?
			Object.keys( value ).filter( ( key ) => !excludedKeys.includes( key ) ) :
			[];
	},

	/**
	 * Returns an array with the terminal values of a monolingual string set.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {Array}
	 */
	getZMonolingualStringsetValues: function ( value ) {
		if ( !value || typeof value !== 'object' ) {
			return [];
		}
		const monoTexts = value[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ];
		return ( monoTexts && Array.isArray( monoTexts ) && monoTexts.length > 0 ) ?
			monoTexts.slice( 1 ).map( ( item ) => zobjectUtils.getZStringTerminalValue( item ) ) :
			[];
	},

	/**
	 * Returns the terminal language value of a monolingual stringset object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZMonolingualStringsetLang: function ( value ) {
		return ( value && typeof value === 'object' ) ?
			zobjectUtils.getZLangTerminalValue( value[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ] ) :
			undefined;
	},

	/**
	 * Returns the terminal value of an argument reference object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZArgumentReferenceTerminalValue: function ( value ) {
		return ( value && typeof value === 'object' ) ?
			zobjectUtils.getZStringTerminalValue( value[ Constants.Z_ARGUMENT_REFERENCE_KEY ] ) :
			undefined;
	},

	/**
	 * Returns the terminal value of a test target function.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZTesterFunctionZid: function ( value ) {
		return ( value && typeof value === 'object' ) ?
			zobjectUtils.getZReferenceTerminalValue( value[ Constants.Z_TESTER_FUNCTION ] ) :
			undefined;
	},

	/**
	 * Returns the terminal value of an implementation target function.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZImplementationFunctionZid: function ( value ) {
		return ( value && typeof value === 'object' ) ?
			zobjectUtils.getZReferenceTerminalValue( value[ Constants.Z_IMPLEMENTATION_FUNCTION ] ) :
			undefined;
	},

	/**
	 * Returns the key that defines the type of implementation (code,
	 * composition, or builtin), or undefined if there's no key.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZImplementationContentType: function ( value ) {
		const contentKeys = [
			Constants.Z_IMPLEMENTATION_CODE,
			Constants.Z_IMPLEMENTATION_COMPOSITION,
			Constants.Z_IMPLEMENTATION_BUILT_IN
		];
		// Any implementation keys that are present and have non falsy content
		const availableKeys = Object.keys( value || {} )
			.filter( ( key ) => contentKeys.includes( key ) && !!value[ key ] );
		return availableKeys.length === 1 ? availableKeys[ 0 ] : undefined;
	},

	/**
	 * Returns the terminal value of the code programming language,
	 * which will always be a reference.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZCodeProgrammingLanguageId: function ( value ) {
		const lang = ( value && typeof value === 'object' ) ? value[ Constants.Z_CODE_LANGUAGE ] : undefined;
		return zobjectUtils.getZReferenceTerminalValue( lang );
	},

	/**
	 * Returns the terminal string value of the code.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZCodeString: function ( value ) {
		const code = ( value && typeof value === 'object' ) ? value[ Constants.Z_CODE_CODE ] : undefined;
		return zobjectUtils.getZStringTerminalValue( code );
	},

	/**
	 * Returns the terminal string value of the HTML object.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {string|undefined}
	 */
	getZHTMLFragmentTerminalValue: function ( value ) {
		const html = ( value && typeof value === 'object' ) ? value[ Constants.Z_HTML_FRAGMENT_VALUE ] : undefined;
		return zobjectUtils.getZStringTerminalValue( html );
	},

	/**
	 * Returns whether the given key object is marked as identity
	 * by setting Z3K4/is identity key to true.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {boolean}
	 */
	getZKeyIsIdentity: function ( value ) {
		const flag = ( value && typeof value === 'object' ) ? value[ Constants.Z_KEY_IS_IDENTITY ] : undefined;

		const bool = ( flag && typeof flag === 'object' && Constants.Z_BOOLEAN_IDENTITY in flag ) ?
			zobjectUtils.getZBooleanValue( flag ) :
			zobjectUtils.getZReferenceTerminalValue( flag );

		return bool === Constants.Z_BOOLEAN_TRUE;
	},

	/**
	 * Returns an array of all the terminal language values in an multilingual string object.
	 *
	 * @param {Object} value
	 * @return {Array}
	 */
	getZMultilingualLangs: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRING_VALUE in value ) ) {
			return [];
		}
		const monolinguals = value[ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );
		return monolinguals.map( ( monolingual ) => zobjectUtils.getZMonolingualLangValue( monolingual ) );
	},

	/**
	 * Returns an array of all the multilingual string objects.
	 *
	 * @param {Object} value
	 * @return {Array}
	 */
	getZMultilingualValues: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRING_VALUE in value ) ) {
			return [];
		}
		return value[ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );
	},

	/**
	 * Returns an array of all the language references or language
	 * in the array of monolingual stringset objects.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @return {Array}
	 */
	getZMultilingualStringsetLangs: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRINGSET_VALUE in value ) ) {
			return [];
		}
		const monolingualSets = value[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ].slice( 1 );
		return monolingualSets.map( ( monolingualSet ) => zobjectUtils.getZMonolingualStringsetLang( monolingualSet ) );
	},

	/**
	 * Find a monolingual string item in a multilingual string
	 * object for a given language and returns:
	 * * its index in the array of monolinguals (including benjamin),
	 * * its terminal string value.
	 * Or undefined if no monolingual object was found.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @param {string} lang
	 * @return {Object|undefined}
	 */
	getZMonolingualItemForLang: function ( value, lang ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRING_VALUE in value ) ) {
			return undefined;
		}
		const monolinguals = value[ Constants.Z_MULTILINGUALSTRING_VALUE ];
		for ( let index = 1; index < monolinguals.length; index++ ) {
			if ( zobjectUtils.getZMonolingualLangValue( monolinguals[ index ] ) === lang ) {
				const foundValue = zobjectUtils.getZMonolingualTextValue( monolinguals[ index ] );
				return { index, value: foundValue };
			}
		}
		return undefined;
	},

	/**
	 * Find a monolingual string set item in a multilingual string set
	 * object for a given language and returns:
	 * * its index in the array of monolingual string sets (including benjamin),
	 * * its terminal string value (array of strings).
	 * Or undefined if no monolingual string set was found.
	 * Accepts both canonical and hybrid.
	 *
	 * @param {Object} value
	 * @param {string} lang
	 * @return {Object|undefined}
	 */
	getZMonolingualStringsetForLang: function ( value, lang ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRINGSET_VALUE in value ) ) {
			return undefined;
		}
		const monolingualSets = value[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ];
		for ( let index = 1; index < monolingualSets.length; index++ ) {
			if ( zobjectUtils.getZMonolingualStringsetLang( monolingualSets[ index ] ) === lang ) {
				const foundValue = zobjectUtils.getZMonolingualStringsetValues( monolingualSets[ index ] );
				return { index, value: foundValue };
			}
		}
		return undefined;
	},

	/**
	 * Returns whether the object is a literal Wikidata Entity.
	 *
	 * @param {Object} value
	 * @return {boolean}
	 */
	isWikidataLiteral: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_OBJECT_TYPE in value ) ) {
			return false;
		}
		const type = hybridToCanonical( value[ Constants.Z_OBJECT_TYPE ] );
		return Constants.WIKIDATA_TYPES.includes( type );
	},
	/**
	 * Returns whether the object is a fetched Wikidata Entity, which
	 * will be shaped as a Function call to one of the Wikidata Fetch
	 * Functions (Z6820-Z6826).
	 * Assumes that the object is a function, returns false if it's not.
	 *
	 * @param {Object} value
	 * @return {boolean}
	 */
	isWikidataFetch: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_FUNCTION_CALL_FUNCTION in value ) ) {
			return false;
		}
		const functionCallFunction = zobjectUtils.getZFunctionCallFunctionId( value, true );
		return Object.keys( Constants.WIKIDATA_FETCH_FUNCTIONS )
			.some( ( k ) => Constants.WIKIDATA_FETCH_FUNCTIONS[ k ] === functionCallFunction );
	},
	/**
	 * Returns whether the object is a Wikidata Reference, which
	 * will be a literal object of one of the Wikidata Reference types
	 * (Z6091-Z6096).
	 *
	 * @param {Object} value
	 * @return {boolean}
	 */
	isWikidataReference: function ( value ) {
		if ( !value || typeof value !== 'object' || !( Constants.Z_OBJECT_TYPE in value ) ) {
			return false;
		}
		const type = hybridToCanonical( value[ Constants.Z_OBJECT_TYPE ] );
		return Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
			.some( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] === type );
	},
	/**
	 * Returns whether the object represents a Wikidata entity,
	 * in any of its valid forms.
	 *
	 * @param {Object} value
	 * @return {boolean}
	 */
	isWikidataEntity: function ( value ) {
		return (
			zobjectUtils.isWikidataFetch( value ) ||
			zobjectUtils.isWikidataReference( value ) ||
			zobjectUtils.isWikidataLiteral( value )
		);
	},
	/**
	 * @param {Object} value
	 * @param {string} wikidataType
	 * @return {string|undefined}
	 */
	getWikidataEntityId: function ( value, wikidataType ) {
		let wikidataRef;

		if ( !value || typeof value !== 'object' || !( Constants.Z_OBJECT_TYPE in value ) ) {
			return undefined;
		}

		// Type is either Z7/Function call, a Wikidata reference type or a Wikidata type:
		const type = hybridToCanonical( value[ Constants.Z_OBJECT_TYPE ] );

		// If Wikidata reference type: Assign initial value
		// - Z1K1: refType
		// - [refType]K1: entityId
		if ( type === Constants.WIKIDATA_REFERENCE_TYPES[ wikidataType ] ) {
			wikidataRef = value;
		}

		// If Wikidata type: The Wikidata entity reference is in the first key
		// - Z1K1: wikidataType
		// - [wikidataType]K1:
		//   - Z1K1: refType
		//   - [refType]K1: entityId
		if ( Constants.WIKIDATA_TYPES.includes( type ) ) {
			const identityKey = `${ type }K1`;
			wikidataRef = value[ identityKey ];
		}

		// If Function call: The Wikidata entity reference is in the first argument
		// - Z1K1: Z7
		// - Z7K1: fetchFunction
		// - [fetchFunction]K1:
		//   - Z1K1: refType
		//   - [refType]K1: entityId
		if ( type === Constants.Z_FUNCTION_CALL ) {
			const fetchFunction = Constants.WIKIDATA_FETCH_FUNCTIONS[ wikidataType ];
			const fetchFunctionRefKey = `${ fetchFunction }K1`;
			wikidataRef = value[ fetchFunctionRefKey ];
		}

		if ( !wikidataRef ) {
			return undefined;
		}

		// Once we have the Wikidata reference, return its terminal ID
		const referenceType = Constants.WIKIDATA_REFERENCE_TYPES[ wikidataType ];
		const referenceTypeIdKey = `${ referenceType }K1`;
		return zobjectUtils.getZStringTerminalValue( wikidataRef[ referenceTypeIdKey ] );
	},

	/**
	 * Recursively walks a nested generic type and returns
	 * the field IDs and whether they are valid or not.
	 * Returns a flat array of validated fields [ { fieldPath, isValid } ]
	 *
	 * @param {Array} keyPath
	 * @param {Object} value
	 * @return {Array}
	 */
	validateGenericType: function ( keyPath, value ) {
		const fields = [];

		// If value is overall missing, set as invalid
		if ( !value || typeof value !== 'object' ) {
			fields.push( {
				keyPath: keyPath.join( '.' ),
				isValid: false
			} );
		}

		// If terminal value is missing, set as invalid, else valid
		const isFunctionCall = ( Constants.Z_FUNCTION_CALL_FUNCTION in value );
		const terminalValue = isFunctionCall ?
			zobjectUtils.getZFunctionCallFunctionId( value, true ) :
			zobjectUtils.getZReferenceTerminalValue( value );

		const terminalKeyPath = isFunctionCall ? [ Constants.Z_FUNCTION_CALL_FUNCTION ] : [];

		fields.push( {
			keyPath: [ ...keyPath, ...terminalKeyPath ].join( '.' ),
			isValid: !!terminalValue
		} );

		// If type is a function call, recursively validate its fields
		if ( isFunctionCall ) {
			const argKeys = zobjectUtils.getZFunctionCallArgumentKeys( value );
			for ( const key of argKeys ) {
				const keyFields = zobjectUtils.validateGenericType( [ ...keyPath, key ], value[ key ] );
				fields.push( ...keyFields );
			}
		}

		return fields;
	},

	/**
	 * Recursively walks a function call and returns the
	 * terminal field IDs and whether they are valid or not.
	 * Returns a flat array of validated fields [ { fieldPath, isValid } ]
	 * Terminal fields are:
	 * * For a function call Z7, field Z7K1
	 * * For an argument reference Z18, field Z18K1
	 *
	 * @param {Array} keyPath
	 * @param {Object} value
	 * @return {Array}
	 */
	validateFunctionCall: function ( keyPath, value ) {
		// If value is overall missing: return invalid
		if ( !value || typeof value !== 'object' ) {
			return [ {
				keyPath: keyPath.join( '.' ),
				isValid: false
			} ];
		}

		// If it has an argument reference key: Validate and exit
		if ( Constants.Z_ARGUMENT_REFERENCE_KEY in value ) {
			const terminalArgRef = zobjectUtils.getZArgumentReferenceTerminalValue( value );
			return [ {
				keyPath: [ ...keyPath, Constants.Z_ARGUMENT_REFERENCE_KEY ].join( '.' ),
				isValid: !!terminalArgRef
			} ];
		}

		// If it has a function call function key:
		// * If it contains a reference: Validate and exit
		// * If it contains an object: recurse
		if ( Constants.Z_FUNCTION_CALL_FUNCTION in value ) {
			const parentKeyPath = [ ...keyPath, Constants.Z_FUNCTION_CALL_FUNCTION ];
			let terminalRef = value[ Constants.Z_FUNCTION_CALL_FUNCTION ];

			if ( ( typeof terminalRef === 'object' ) && ( Constants.Z_REFERENCE_ID in terminalRef ) ) {
				terminalRef = zobjectUtils.getZReferenceTerminalValue( terminalRef );
			}

			if ( typeof terminalRef !== 'object' ) {
				return [ {
					keyPath: parentKeyPath.join( '.' ),
					isValid: !!terminalRef
				} ];
			}

			const childFields = zobjectUtils.validateFunctionCall( parentKeyPath, terminalRef );
			const hasErrors = childFields.some( ( field ) => !field.isValid );
			const parentField = {
				keyPath: parentKeyPath.join( '.' ),
				isValid: !hasErrors
			};
			return [ parentField, ...childFields ];
		}

		// If it has no Z18K1 nor Z7K1: return invalid
		return [ {
			keyPath: keyPath.join( '.' ),
			isValid: false
		} ];
	},

	/**
	 * Creates a parser call ZObject.
	 *
	 * {
	 *   Z1K1: Z7,
	 *   Z7K1: <parserZid>,
	 *   <parserZid>K1: <zobject>,
	 *   <parserZid>K2: <zlang>
	 * }
	 *
	 * @param {Object} payload
	 * @param {string} payload.parserZid
	 * @param {any} payload.zobject
	 * @param {string} payload.zlang
	 * @return {Object}
	 */
	createParserCall: function ( { parserZid, zobject, zlang } ) {
		const parserCall = getScaffolding( Constants.Z_FUNCTION_CALL );
		parserCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = parserZid;
		parserCall[ `${ parserZid }K1` ] = zobject;
		parserCall[ `${ parserZid }K2` ] = zlang;
		return parserCall;
	},

	/**
	 * Creates a renderer call ZObject.
	 *
	 * {
	 *   Z1K1: Z7,
	 *   Z7K1: <rendererZid>,
	 *   <rendererZid>K1: <zobject>,
	 *   <rendererZid>K2: <zlang>
	 * }
	 *
	 * @param {Object} payload
	 * @param {string} payload.rendererZid
	 * @param {any} payload.zobject
	 * @param {string} payload.zlang
	 * @return {Object}
	 */
	createRendererCall: function ( { rendererZid, zobject, zlang } ) {
		const rendererCall = getScaffolding( Constants.Z_FUNCTION_CALL );
		rendererCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = rendererZid;
		rendererCall[ `${ rendererZid }K1` ] = zobject;
		rendererCall[ `${ rendererZid }K2` ] = zlang;
		return rendererCall;
	},

	/**
	 * Generic recursive walker for ZObjects.
	 * Calls a callback for every object visited.
	 *
	 * @param {Object} obj - The current object
	 * @param {Array} path - The current key path
	 * @param {Function} visitor - A function (obj, path) => any
	 * @return {Array} collected results from the visitor
	 */
	walkZObject: function ( obj, path, visitor ) {
		const results = [];

		if ( !obj || typeof obj !== 'object' ) {
			return results;
		}

		results.push( ...( visitor( obj, path ) || [] ) );

		for ( const [ key, value ] of Object.entries( obj ) ) {
			if ( Array.isArray( value ) ) {
				value.forEach( ( item, i ) => {
					results.push( ...zobjectUtils.walkZObject( item, [ ...path, key, i ], visitor ) );
				} );
			} else if ( value && typeof value === 'object' ) {
				results.push( ...zobjectUtils.walkZObject( value, [ ...path, key ], visitor ) );
			}
		}

		return results;
	}

};

module.exports = zobjectUtils;
