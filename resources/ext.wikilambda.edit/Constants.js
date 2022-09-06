/*!
 * WikiLambda Vue constants file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = {
		EXCLUDED_Z_TYPES: [ 'Z2', 'Z7' ],
		NEW_ZID_PLACEHOLDER: 'Z0',
		Z_OBJECT: 'Z1',
		Z_OBJECT_TYPE: 'Z1K1',
		Z_PERSISTENTOBJECT: 'Z2',
		Z_PERSISTENTOBJECT_ID: 'Z2K1',
		Z_PERSISTENTOBJECT_VALUE: 'Z2K2',
		Z_PERSISTENTOBJECT_LABEL: 'Z2K3',
		Z_PERSISTENTOBJECT_ALIASES: 'Z2K4',
		Z_KEY: 'Z3',
		Z_KEY_TYPE: 'Z3K1',
		Z_KEY_ID: 'Z3K2',
		Z_KEY_LABEL: 'Z3K3',
		Z_TYPE: 'Z4',
		Z_TYPE_IDENTITY: 'Z4K1',
		Z_TYPE_KEYS: 'Z4K2',
		Z_TYPE_VALIDATOR: 'Z4K3',
		Z_ERROR: 'Z5',
		Z_ERROR_TYPE: 'Z5K1',
		Z_ERROR_VALUE: 'Z5K2',
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
		Z_KEY_MODES: {
			LITERAL: 'literal',
			REFERENCE: 'reference',
			FUNCTION_CALL: 'function_call',
			GENERIC_LITERAL: 'generic_literal',
			JSON: 'json',
			ARGUMENT_REF: 'argument_ref'
		},
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
		Z_NATURAL_LANGUAGE_ENGLISH: 'Z1002',
		Z_NATURAL_LANGUAGE_CHINESE: 'Z1006',
		Z_NATURAL_LANGUAGE_CHINESE_TAIWAN: 'Z1107',
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
		PAGINATION_SIZE: 5
	},
	implementationModes = {
		CODE: 'code',
		COMPOSITION: 'composition'
	},
	modes = [
		{ key: Constants.Z_KEY_MODES.REFERENCE, value: 'wikilambda-modeselector-reference', label: 'wikilambda-reference', type: Constants.Z_REFERENCE },
		{ key: Constants.Z_KEY_MODES.FUNCTION_CALL, value: 'wikilambda-modeselector-functioncall', label: 'wikilambda-functioncall', type: Constants.Z_FUNCTION_CALL },
		{ key: Constants.Z_KEY_MODES.LITERAL, value: 'wikilambda-modeselector-literal', label: 'wikilambda-literal', type: null },
		{ key: Constants.Z_KEY_MODES.GENERIC_LITERAL, value: 'wikilambda-modeselector-genericliteral', label: 'wikilambda-genericliteral', type: null },
		{ key: Constants.Z_KEY_MODES.JSON, value: 'wikilambda-modeselector-json', label: 'wikilambda-json', type: null },
		{ key: Constants.Z_KEY_MODES.ARGUMENT_REF, value: 'wikilambda-modeselector-argref', label: 'wikilambda-argref', type: Constants.Z_ARGUMENT_REFERENCE }
	],
	typedObjectsList = [ Constants.Z_TYPED_LIST, Constants.Z_TYPED_PAIR, Constants.Z_TYPED_MAP ],
	views = {
		FUNCTION_EDITOR: 'function-editor',
		FUNCTION_VIEWER: 'function-viewer',
		Z_OBJECT_EDITOR: 'zobject-editor',
		Z_OBJECT_VIEWER: 'zobject-viewer'
	},
	paths = {
		CREATE_Z_OBJECT: '/wiki/Special:CreateZObject',
		EVALUTATE_FUNCTION_CALL: '/wiki/Special:EvaluateFunctionCall',
		EDIT_Z_OBJECT: '/w/index.php',
		VIEW_Z_OBJECT: ''
	},
	breakpoints = {
		MOBILE: 320,
		TABLET: 720,
		DESKTOP: 1000,
		DESKTOP_WIDE: 1200,
		DESKTOP_EXTRAWIDE: 2000
	},
	breakpointsTypes = {
		MOBILE: 'MOBILE',
		TABLET: 'TABLET',
		DESKTOP: 'DESKTOP',
		DESKTOP_WIDE: 'DESKTOP_WIDE',
		DESKTOP_EXTRAWIDE: 'DESKTOP_EXTRAWIDE'
	};

Constants.Z_MODE_SELECTOR_MODES = modes;
Constants.Z_TYPED_OBEJECTS_LIST = typedObjectsList;
Constants.VIEWS = views;
Constants.PATHS = paths;
Constants.breakpoints = breakpoints;
Constants.breakpointsTypes = breakpointsTypes;
Constants.implementationModes = implementationModes;

module.exports = Constants;
