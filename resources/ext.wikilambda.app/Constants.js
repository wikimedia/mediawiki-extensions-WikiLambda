/*!
 * WikiLambda Vue constants file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Constants = {
	NEW_ZID_PLACEHOLDER: 'Z0',
	Z_OBJECT: 'Z1',
	Z_OBJECT_TYPE: 'Z1K1',
	Z_PERSISTENTOBJECT: 'Z2',
	Z_PERSISTENTOBJECT_ID: 'Z2K1',
	Z_PERSISTENTOBJECT_VALUE: 'Z2K2',
	Z_PERSISTENTOBJECT_LABEL: 'Z2K3',
	Z_PERSISTENTOBJECT_ALIASES: 'Z2K4',
	Z_PERSISTENTOBJECT_DESCRIPTION: 'Z2K5',
	Z_KEY: 'Z3',
	Z_KEY_TYPE: 'Z3K1',
	Z_KEY_ID: 'Z3K2',
	Z_KEY_LABEL: 'Z3K3',
	Z_KEY_IS_IDENTITY: 'Z3K4',
	Z_TYPE: 'Z4',
	Z_TYPE_IDENTITY: 'Z4K1',
	Z_TYPE_KEYS: 'Z4K2',
	Z_TYPE_VALIDATOR: 'Z4K3',
	Z_TYPE_EQUALITY: 'Z4K4',
	Z_TYPE_RENDERER: 'Z4K5',
	Z_TYPE_PARSER: 'Z4K6',
	Z_TYPE_DESERIALISERS: 'Z4K7',
	Z_TYPE_SERIALISERS: 'Z4K8',
	Z_ERROR: 'Z5',
	Z_ERROR_TYPE: 'Z5K1',
	Z_ERROR_VALUE: 'Z5K2',
	Z_ERRORTYPE: 'Z50',
	Z_ERRORTYPE_KEYS: 'Z50K1',
	Z_GENERIC_ERROR: 'Z500',
	Z_GENERIC_ERROR_VALUE: 'Z500K1',
	Z_STRING: 'Z6',
	Z_STRING_VALUE: 'Z6K1',
	Z_FUNCTION: 'Z8',
	Z_ARGUMENT: 'Z17',
	Z_ARGUMENT_TYPE: 'Z17K1',
	Z_ARGUMENT_KEY: 'Z17K2',
	Z_ARGUMENT_LABEL: 'Z17K3',
	Z_REFERENCE: 'Z9',
	Z_REFERENCE_ID: 'Z9K1',
	Z_KEY_REFERENCE: 'Z39',
	Z_KEY_REFERENCE_ID: 'Z39K1',
	Z_MONOLINGUALSTRING: 'Z11',
	Z_MONOLINGUALSTRING_LANGUAGE: 'Z11K1',
	Z_MONOLINGUALSTRING_VALUE: 'Z11K2',
	Z_MULTILINGUALSTRING: 'Z12',
	Z_MULTILINGUALSTRING_VALUE: 'Z12K1',
	Z_FUNCTION_ARGUMENTS: 'Z8K1',
	Z_FUNCTION_RETURN_TYPE: 'Z8K2',
	Z_FUNCTION_TESTERS: 'Z8K3',
	Z_FUNCTION_IMPLEMENTATIONS: 'Z8K4',
	Z_FUNCTION_IDENTITY: 'Z8K5',
	Z_CODE: 'Z16',
	Z_CODE_LANGUAGE: 'Z16K1',
	Z_PROGRAMMING_LANGUAGE: 'Z61',
	Z_PROGRAMMING_LANGUAGE_CODE: 'Z61K1',
	Z_CODE_CODE: 'Z16K2',
	Z_FUNCTION_CALL: 'Z7',
	Z_FUNCTION_CALL_FUNCTION: 'Z7K1',
	Z_FUNCTION_STRING_EQUALITY: 'Z866',
	Z_FUNCTION_BOOLEAN_EQUALITY: 'Z844',
	Z_FUNCTION_VALIDATE_EVALUATION_RESULT: 'Z122',
	Z_BOOLEAN: 'Z40',
	Z_BOOLEAN_TRUE: 'Z41',
	Z_BOOLEAN_FALSE: 'Z42',
	Z_BOOLEAN_IDENTITY: 'Z40K1',
	Z_IMPLEMENTATION: 'Z14',
	Z_IMPLEMENTATION_FUNCTION: 'Z14K1',
	Z_IMPLEMENTATION_COMPOSITION: 'Z14K2',
	Z_IMPLEMENTATION_CODE: 'Z14K3',
	Z_IMPLEMENTATION_BUILT_IN: 'Z14K4',
	Z_RESPONSEENVELOPE: 'Z22',
	Z_RESPONSEENVELOPE_VALUE: 'Z22K1',
	Z_RESPONSEENVELOPE_METADATA: 'Z22K2',
	Z_ARGUMENT_REFERENCE: 'Z18',
	Z_ARGUMENT_REFERENCE_KEY: 'Z18K1',
	Z_NOTHING: 'Z23',
	Z_VOID: 'Z24',
	Z_TESTER: 'Z20',
	Z_TESTER_FUNCTION: 'Z20K1',
	Z_TESTER_CALL: 'Z20K2',
	Z_TESTER_VALIDATION: 'Z20K3',
	Z_CHARACTER: 'Z86',
	Z_CHARACTER_VALUE: 'Z86K1',
	Z_MONOLINGUALSTRINGSET: 'Z31',
	Z_MONOLINGUALSTRINGSET_LANGUAGE: 'Z31K1',
	Z_MONOLINGUALSTRINGSET_VALUE: 'Z31K2',
	Z_MULTILINGUALSTRINGSET: 'Z32',
	Z_MULTILINGUALSTRINGSET_VALUE: 'Z32K1',
	Z_NATURAL_LANGUAGE: 'Z60',
	Z_NATURAL_LANGUAGE_ISO_CODE: 'Z60K1',
	Z_NATURAL_LANGUAGE_ARABIC: 'Z1001',
	Z_NATURAL_LANGUAGE_ENGLISH: 'Z1002',
	Z_NATURAL_LANGUAGE_SPANISH: 'Z1003',
	Z_NATURAL_LANGUAGE_FRENCH: 'Z1004',
	Z_NATURAL_LANGUAGE_RUSSIAN: 'Z1005',
	Z_NATURAL_LANGUAGE_CHINESE: 'Z1006',
	Z_NATURAL_LANGUAGE_CHINESE_TRADITIONAL: 'Z1672',
	Z_NATURAL_LANGUAGE_CHINESE_SIMPLIFIED: 'Z1645',
	Z_NATURAL_LANGUAGE_AFRIKAANS: 'Z1532',
	Z_NATURAL_LANGUAGE_CANADIAN_FRENCH: 'Z1640',
	Z_NATURAL_LANGUAGE_CHINESE_TAIWAN: 'Z1107',
	Z_DESERIALISER: 'Z46',
	Z_DESERIALISER_TYPE: 'Z46K1',
	Z_DESERIALISER_VALUE: 'Z46K2',
	Z_DESERIALISER_CONVERTER: 'Z46K3',
	Z_SERIALISER: 'Z64',
	Z_SERIALISER_TYPE: 'Z64K1',
	Z_SERIALISER_VALUE: 'Z64K2',
	Z_SERIALISER_CONVERTER: 'Z64K3',
	Z_HTML_FRAGMENT: 'Z89',
	Z_HTML_FRAGMENT_VALUE: 'Z89K1',
	Z_QUOTE: 'Z99',
	Z_QUOTE_VALUE: 'Z99K1',
	Z_VALIDATE_OBJECT: 'Z101',
	Z_TYPED_LIST: 'Z881',
	Z_TYPED_LIST_TYPE: 'Z881K1',
	Z_TYPED_OBJECT_ELEMENT_1: 'K1',
	Z_TYPED_OBJECT_ELEMENT_2: 'K2',
	Z_TYPED_PAIR: 'Z882',
	Z_TYPED_PAIR_TYPE1: 'Z882K1',
	Z_TYPED_PAIR_TYPE2: 'Z882K2',
	Z_TYPED_MAP: 'Z883',
	Z_TYPED_MAP_TYPE1: 'Z883K1',
	Z_TYPED_MAP_TYPE2: 'Z883K2',
	Z_FUNCTION_CALL_TO_TYPE: 'function_call_to_type',
	Z_GREGORIAN_CALENDAR_DATE: 'Z20420'
};

// Wikidata:
Constants.WIKIDATA_BASE_URL = 'https://www.wikidata.org';

// Wikidata Entity Types:
Constants.Z_WIKIDATA_ITEM = 'Z6001';
Constants.Z_WIKIDATA_PROPERTY = 'Z6002';
Constants.Z_WIKIDATA_STATEMENT = 'Z6003';
Constants.Z_WIKIDATA_LEXEME_FORM = 'Z6004';
Constants.Z_WIKIDATA_LEXEME = 'Z6005';
Constants.Z_WIKIDATA_LEXEME_SENSE = 'Z6006';

// Wikidata Reference Types:
Constants.Z_WIKIDATA_REFERENCE_ITEM = 'Z6091';
Constants.Z_WIKIDATA_REFERENCE_ITEM_ID = 'Z6091K1';
Constants.Z_WIKIDATA_REFERENCE_PROPERTY = 'Z6092';
Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID = 'Z6092K1';
Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM = 'Z6094';
Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID = 'Z6094K1';
Constants.Z_WIKIDATA_REFERENCE_LEXEME = 'Z6095';
Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID = 'Z6095K1';
Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE = 'Z6096';
Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID = 'Z6096K1';

// Wikidata Entity Fetch Functions:
Constants.Z_WIKIDATA_FETCH_ITEM = 'Z6821';
Constants.Z_WIKIDATA_FETCH_ITEM_ID = 'Z6821K1';
Constants.Z_WIKIDATA_FETCH_PROPERTY = 'Z6822';
Constants.Z_WIKIDATA_FETCH_PROPERTY_ID = 'Z6822K1';
Constants.Z_WIKIDATA_FETCH_LEXEME_FORM = 'Z6824';
Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID = 'Z6824K1';
Constants.Z_WIKIDATA_FETCH_LEXEME = 'Z6825';
Constants.Z_WIKIDATA_FETCH_LEXEME_ID = 'Z6825K1';
Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE = 'Z6826';
Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID = 'Z6826K1';

// ZObject enum
Constants.Z_OBJECT_ENUM = 'Z884';

// Wikidata enum
Constants.Z_WIKIDATA_ENUM = 'Z6884';
Constants.Z_WIKIDATA_ENUM_TYPE = 'Z6884K1';
Constants.Z_WIKIDATA_ENUM_REFERENCES = 'Z6884K2';
Constants.Z_WIKIDATA_ENUM_IDENTITY = 'Z6884K3';

// Wikidata Types
Constants.WIKIDATA_TYPES = [
	Constants.Z_WIKIDATA_ITEM,
	Constants.Z_WIKIDATA_PROPERTY,
	Constants.Z_WIKIDATA_STATEMENT,
	Constants.Z_WIKIDATA_LEXEME_FORM,
	Constants.Z_WIKIDATA_LEXEME,
	Constants.Z_WIKIDATA_LEXEME_SENSE
];

// Wikidata Reference Types (indexed by Wikidata type)
Constants.WIKIDATA_REFERENCE_TYPES = {
	[ Constants.Z_WIKIDATA_ITEM ]: Constants.Z_WIKIDATA_REFERENCE_ITEM,
	[ Constants.Z_WIKIDATA_PROPERTY ]: Constants.Z_WIKIDATA_REFERENCE_PROPERTY,
	[ Constants.Z_WIKIDATA_LEXEME ]: Constants.Z_WIKIDATA_REFERENCE_LEXEME,
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM,
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE
};

// Wikidata Entity Fetch Functions (indexed by Wikidata type)
Constants.WIKIDATA_FETCH_FUNCTIONS = {
	[ Constants.Z_WIKIDATA_ITEM ]: Constants.Z_WIKIDATA_FETCH_ITEM,
	[ Constants.Z_WIKIDATA_PROPERTY ]: Constants.Z_WIKIDATA_FETCH_PROPERTY,
	[ Constants.Z_WIKIDATA_LEXEME ]: Constants.Z_WIKIDATA_FETCH_LEXEME,
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: Constants.Z_WIKIDATA_FETCH_LEXEME_FORM,
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE
};

// Wikidata API values for the type property
// https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities
Constants.WIKIDATA_API_TYPE_VALUES = {
	[ Constants.Z_WIKIDATA_ITEM ]: 'item',
	[ Constants.Z_WIKIDATA_PROPERTY ]: 'property',
	[ Constants.Z_WIKIDATA_LEXEME ]: 'lexeme',
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: 'form',
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: 'sense'
};

// Wikidata simplified types
Constants.WIKIDATA_SIMPLIFIED_TYPES = {
	[ Constants.Z_WIKIDATA_ITEM ]: Constants.Z_WIKIDATA_ITEM,
	[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: Constants.Z_WIKIDATA_ITEM,
	[ Constants.Z_WIKIDATA_FETCH_ITEM ]: Constants.Z_WIKIDATA_ITEM,
	[ Constants.Z_WIKIDATA_LEXEME ]: Constants.Z_WIKIDATA_LEXEME,
	[ Constants.Z_WIKIDATA_FETCH_LEXEME ]: Constants.Z_WIKIDATA_LEXEME,
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME ]: Constants.Z_WIKIDATA_LEXEME,
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: Constants.Z_WIKIDATA_LEXEME_FORM,
	[ Constants.Z_WIKIDATA_FETCH_LEXEME_FORM ]: Constants.Z_WIKIDATA_LEXEME_FORM,
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ]: Constants.Z_WIKIDATA_LEXEME_FORM,
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: Constants.Z_WIKIDATA_LEXEME_SENSE,
	[ Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE ]: Constants.Z_WIKIDATA_LEXEME_SENSE,
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ]: Constants.Z_WIKIDATA_LEXEME_SENSE,
	[ Constants.Z_WIKIDATA_PROPERTY ]: Constants.Z_WIKIDATA_PROPERTY,
	[ Constants.Z_WIKIDATA_FETCH_PROPERTY ]: Constants.Z_WIKIDATA_PROPERTY,
	[ Constants.Z_WIKIDATA_REFERENCE_PROPERTY ]: Constants.Z_WIKIDATA_PROPERTY
};

// Wikidata selector placeholders
Constants.WIKIDATA_SELECTOR_PLACEHOLDER_MSG = {
	[ Constants.Z_WIKIDATA_ITEM ]: 'wikilambda-wikidata-item-selector-placeholder',
	[ Constants.Z_WIKIDATA_LEXEME ]: 'wikilambda-wikidata-lexeme-selector-placeholder',
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: 'wikilambda-wikidata-lexeme-form-selector-placeholder',
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: 'wikilambda-wikidata-lexeme-sense-selector-placeholder',
	[ Constants.Z_WIKIDATA_PROPERTY ]: 'wikilambda-wikidata-property-selector-placeholder'
};

// Visual editor Wikidata input error messages
Constants.WIKIDATA_INPUT_ERROR_MSG = {
	[ Constants.Z_WIKIDATA_ITEM ]: 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-item',
	[ Constants.Z_WIKIDATA_LEXEME ]: 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme',
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme-form',
	[ Constants.Z_WIKIDATA_PROPERTY ]: 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-property'
};

Constants.BUILTIN_TYPE_CONFIG = {
	[ Constants.Z_ARGUMENT_REFERENCE ]: {
		hasBuiltin: true,
		component: 'wl-z-argument-reference',
		allowExpansion: true
	},
	[ Constants.Z_FUNCTION_CALL ]: {
		hasBuiltin: true,
		component: 'wl-z-function-call',
		allowExpansion: true
	},
	[ Constants.Z_HTML_FRAGMENT ]: {
		hasBuiltin: true,
		component: 'wl-z-html-fragment',
		allowExpansion: false
	},
	[ Constants.Z_RESPONSEENVELOPE ]: {
		hasBuiltin: false,
		component: 'wl-z-evaluation-result',
		allowExpansion: true
	},
	[ Constants.Z_IMPLEMENTATION ]: {
		hasBuiltin: true,
		component: 'wl-z-implementation',
		allowExpansion: false
	},
	[ Constants.Z_TESTER ]: {
		hasBuiltin: true,
		component: 'wl-z-tester',
		allowExpansion: false
	},
	[ Constants.Z_MONOLINGUALSTRING ]: {
		hasBuiltin: true,
		component: 'wl-z-monolingual-string',
		allowExpansion: true
	},
	[ Constants.Z_MULTILINGUALSTRING ]: {
		hasBuiltin: true,
		component: 'wl-z-multilingual-string',
		allowExpansion: false,
		expandToSelf: false
	},
	[ Constants.Z_STRING ]: {
		hasBuiltin: true,
		component: 'wl-z-string',
		allowExpansion: false
	},
	[ Constants.Z_REFERENCE ]: {
		hasBuiltin: true,
		component: 'wl-z-reference',
		allowExpansion: false
	},
	[ Constants.Z_BOOLEAN ]: {
		hasBuiltin: true,
		component: 'wl-z-boolean',
		allowExpansion: true
	},
	[ Constants.Z_CODE ]: {
		hasBuiltin: true,
		component: 'wl-z-code',
		allowExpansion: false
	},
	[ Constants.Z_TYPED_LIST ]: {
		hasBuiltin: true,
		component: 'wl-z-typed-list',
		allowExpansion: true,
		expandToSelf: true
	},
	[ Constants.Z_WIKIDATA_ITEM ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-item',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-item',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_LEXEME ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_LEXEME_FORM ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme-form',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme-form',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_LEXEME_SENSE ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme-sense',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-lexeme-sense',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_PROPERTY ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-property',
		allowExpansion: true
	},
	[ Constants.Z_WIKIDATA_REFERENCE_PROPERTY ]: {
		hasBuiltin: true,
		component: 'wl-wikidata-property',
		allowExpansion: true
	}
};

// Function input type configuration for FunctionInputField.vue
// Maps input types to their corresponding input components
Constants.FUNCTION_INPUT_TYPE_CONFIG = {
	[ Constants.Z_STRING ]: {
		component: 'wl-function-input-string'
	},
	[ Constants.Z_NATURAL_LANGUAGE ]: {
		component: 'wl-function-input-language'
	},
	[ Constants.Z_WIKIDATA_ITEM ]: {
		component: 'wl-function-input-wikidata'
	},
	[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: {
		component: 'wl-function-input-wikidata'
	},
	[ Constants.Z_WIKIDATA_LEXEME ]: {
		component: 'wl-function-input-wikidata'
	},
	[ Constants.Z_WIKIDATA_REFERENCE_LEXEME ]: {
		component: 'wl-function-input-wikidata'
	}
};

// Types that must be considered enums
// but have a builtin component:
Constants.BUILTIN_ENUMS = [
	Constants.Z_BOOLEAN
];

Constants.ACTIONS = {
	EDIT: 'edit'
};

// Api Limits
Constants.API_ENUMS_LIMIT = 10;
Constants.API_LIMIT_MAX = 100;
Constants.API_REQUEST_ITEMS_LIMIT = 50;
Constants.API_LIMIT_WIKIDATA = 50;
// App Limits
Constants.DESCRIPTION_CHARS_MAX = 200;
Constants.INPUT_CHARS_MAX = 50;
Constants.LABEL_CHARS_MAX = 50;

// Breakpoints
Constants.BREAKPOINTS = {
	MOBILE: 320,
	TABLET: 720,
	DESKTOP: 1000,
	DESKTOP_WIDE: 1200,
	DESKTOP_EXTRAWIDE: 2000
};
Constants.BREAKPOINT_TYPES = {
	MOBILE: 'MOBILE',
	TABLET: 'TABLET',
	DESKTOP: 'DESKTOP',
	DESKTOP_WIDE: 'DESKTOP_WIDE',
	DESKTOP_EXTRAWIDE: 'DESKTOP_EXTRAWIDE'
};

Constants.COLOR_NESTING_LEVELS = 6;

// Errors
Constants.ERROR_IDS = {
	TEST_RESULTS: 'tests'
};

Constants.ERROR_TYPES = {
	NOTICE: 'notice',
	WARNING: 'warning',
	ERROR: 'error'
};

// EXCLUDE_FROM_ENUMS
// Types that contain an identity key
// but are not considered enums:
// * Z4/Type
// * Z8/Function
// * Z46/Deserialiser
// * Z64/Serialiser
Constants.EXCLUDE_FROM_ENUMS = [
	Constants.Z_TYPE,
	Constants.Z_FUNCTION,
	Constants.Z_DESERIALISER,
	Constants.Z_SERIALISER
];

// EXCLUDE_FROM_PERSISTENT_CONTENT:
// * Z3/Key
// * Z39/Key reference
// * Z17/Argument declaration
// * Z16/Code
Constants.EXCLUDE_FROM_PERSISTENT_CONTENT = [
	Constants.Z_ERROR,
	Constants.Z_KEY,
	Constants.Z_KEY_REFERENCE,
	Constants.Z_ARGUMENT,
	Constants.Z_CODE,
	...Constants.WIKIDATA_TYPES,
	...Object.keys( Constants.WIKIDATA_REFERENCE_TYPES ).map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] )
];

// EXCLUDE_FROM_SELECTOR:
// * Never select persistent object: Z2
// * Never select references: Z9/Z18
// * Never select dynamic types: Z5/Z22
Constants.EXCLUDE_FROM_SELECTOR = [
	Constants.Z_PERSISTENTOBJECT,
	Constants.Z_REFERENCE,
	Constants.Z_ARGUMENT_REFERENCE,
	Constants.Z_RESPONSEENVELOPE
];

// EXCLUDE_FROM_LITERAL_MODE_SELECTION:
// Types that should not be selectable as "Literal <Type>" in the Mode Selector
// * Z4/Type
// * Z8/Function
// * Z61/Programming language
// * Z50/Error type
// * Z14/Implementation
// * Z20/Tester
// * Z46/Deserialiser
// * Z64/Serialiser
Constants.EXCLUDE_FROM_LITERAL_MODE_SELECTION = [
	Constants.Z_TYPE,
	Constants.Z_FUNCTION,
	Constants.Z_PROGRAMMING_LANGUAGE,
	Constants.Z_ERRORTYPE,
	Constants.Z_IMPLEMENTATION,
	Constants.Z_TESTER,
	Constants.Z_DESERIALISER,
	Constants.Z_SERIALISER
];

Constants.LINKED_TYPES = [
	Constants.Z_TYPE,
	Constants.Z_TESTER,
	Constants.Z_IMPLEMENTATION,
	Constants.Z_FUNCTION,
	Constants.Z_NATURAL_LANGUAGE,
	Constants.Z_SERIALISER,
	Constants.Z_DESERIALISER
	// TODO (T296815): Constants.Z_PROGRAMMING_LANGUAGE
];

Constants.LIST_LIMIT_MULTILINGUAL_STRING = 10;

Constants.LIST_MENU_OPTIONS = {
	DELETE_ITEM: 'delete-list-item',
	MOVE_BEFORE: 'move-before',
	MOVE_AFTER: 'move-after',
	ADD_ARG: 'add-arg',
	DELETE_ARG: 'delete-arg'
};

Constants.PATHS = {
	MAIN_PAGE: 'Wikifunctions:Main_Page',
	CREATE_OBJECT_TITLE: 'Special:CreateObject',
	RUN_FUNCTION_TITLE: 'Special:RunFunction',
	LIST_OBJECTS_BY_TYPE_TYPE: 'Special:ListObjectsByType/Z4',
	ROUTE_FORMAT_ONE: '/w/index.php',
	ROUTE_FORMAT_TWO: '/wiki/'
};

Constants.RESOLVER_TYPES = [
	Constants.Z_REFERENCE,
	Constants.Z_FUNCTION_CALL,
	Constants.Z_ARGUMENT_REFERENCE
];

// These constants should not be strings, to safely
// differentiate them from possible terminal strings that
// might contain the same values.
Constants.ROW_VALUE_OBJECT = 1;
Constants.ROW_VALUE_ARRAY = 2;

// Suggested objects for selector
Constants.SUGGESTIONS = {
	TYPES: [
		Constants.Z_STRING,
		Constants.Z_BOOLEAN
	],
	LANGUAGES: [
		Constants.Z_NATURAL_LANGUAGE_ARABIC,
		Constants.Z_NATURAL_LANGUAGE_ENGLISH,
		Constants.Z_NATURAL_LANGUAGE_SPANISH,
		Constants.Z_NATURAL_LANGUAGE_FRENCH,
		Constants.Z_NATURAL_LANGUAGE_RUSSIAN,
		Constants.Z_NATURAL_LANGUAGE_CHINESE_TRADITIONAL,
		Constants.Z_NATURAL_LANGUAGE_CHINESE_SIMPLIFIED
	]
};

Constants.TESTER_STATUS = {
	READY: 'ready',
	PASSED: 'passed',
	FAILED: 'failed',
	RUNNING: 'running',
	CANCELED: 'canceled'
};

Constants.VIEWS = {
	FUNCTION_EDITOR: 'function-editor-view',
	FUNCTION_VIEWER: 'function-viewer-view',
	FUNCTION_EVALUATOR: 'function-evaluator-view',
	DEFAULT: 'default-view'
};

Constants.Z_ERRORS = {
	Z_ERROR_UNKNOWN: 'Z500',
	Z_ERROR_INVALID_JSON: 'Z548',
	Z_ERROR_USER_CANNOT_EDIT: 'Z557'
};

Constants.Z_PROGRAMMING_LANGUAGES = {
	JAVASCRIPT: 'Z600',
	PYTHON: 'Z610'
};

Constants.Z_TYPED_OBJECTS_LIST = [
	Constants.Z_TYPED_LIST,
	Constants.Z_TYPED_PAIR,
	Constants.Z_TYPED_MAP
];

// This constant should list all the Types for which empty values
// are allowed by Visual Editor wikifunction plugin. This can be because:
// * an empty string is a valid value for the type (e.g. Z6), or
// * an empty string will be replaced with a default value, which should be
//   declared and implemented in WikifunctionCallDefaultValue.php class.
Constants.VE_ALLOW_EMPTY_FIELD = [
	Constants.Z_STRING,
	Constants.Z_GREGORIAN_CALENDAR_DATE,
	Constants.Z_WIKIDATA_ITEM,
	Constants.Z_WIKIDATA_REFERENCE_ITEM,
	Constants.Z_NATURAL_LANGUAGE
];

Constants.STORED_OBJECTS = {
	MAIN: 'main',
	FUNCTION_CALL: 'call',
	RESPONSE: 'response'
};

Constants.METADATA_CONTENT_TYPE = {
	TEXT: 1,
	LINK: 2,
	HTML: 3
};

module.exports = Constants;
