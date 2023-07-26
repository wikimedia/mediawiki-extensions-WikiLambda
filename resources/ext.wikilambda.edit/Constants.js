/*!
 * WikiLambda Vue constants file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = {
		// TODO (T336292): Rethink why are we ecluding all these types from general selection?
		// EXCLUDED_Z_TYPES: [ 'Z2', 'Z3', 'Z5', 'Z7', 'Z9', 'Z16', 'Z17', 'Z18', 'Z21', 'Z22', 'Z39' ],
		// Z2: OK - only will be a root zobject, it should not be selected for anything else
		// Z5: always generated dynamically... but shouldn't we be able to select it as a function
		//     output for example?
		// Z7: OK - selected as a mode, never as a type
		// Z9: OK - selected as a mode, never as a type
		// Z16: why can't we use code for things?
		// Z17: also not sure why are we not allowing this
		// Z18: OK - selected as mode, never as a type
		// Z21: we cannot create as root but why can't we choose this for example as an output type?
		// Z22: OK - never show, it's a dynamically created internal type
		// Z39: cannot create as root, but why can't we choose this for other things?
		EXCLUDED_Z_TYPES: [ 'Z2', 'Z7', 'Z9', 'Z18', 'Z22' ],
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
		Z_NATURAL_LANGUAGE_AFRIKAANS: 'Z1532',
		Z_NATURAL_LANGUAGE_CANADIAN_FRENCH: 'Z1640',
		Z_NATURAL_LANGUAGE_CHINESE: 'Z1006',
		Z_NATURAL_LANGUAGE_CHINESE_TAIWAN: 'Z1107',
		Z_NATURAL_LANGUAGE_ENGLISH: 'Z1002',
		Z_NATURAL_LANGUAGE_FRENCH: 'Z1004',
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
	typedObjectsList = [ Constants.Z_TYPED_LIST, Constants.Z_TYPED_PAIR, Constants.Z_TYPED_MAP ],
	views = {
		FUNCTION_EDITOR: 'function-editor',
		FUNCTION_VIEWER: 'function-viewer',
		FUNCTION_EVALUATOR: 'function-evaluator',
		DEFAULT_VIEW: 'default-view'
	},
	paths = {
		MAIN_PAGE: 'Wikifunctions:Main_Page',
		CREATE_OBJECT_TITLE: 'Special:CreateObject',
		RUN_FUNCTION_TITLE: 'Special:RunFunction',
		LIST_OBJECTS_BY_TYPE_TYPE: 'Special:ListObjectsByType/Z4',
		ROUTE_FORMAT_ONE: '/w/index.php',
		ROUTE_FORMAT_TWO: '/wiki/'
	},
	actions = {
		EDIT: 'edit'
	},
	errorTypes = {
		WARNING: 'warning',
		ERROR: 'error'
	},
	errorCodes = {
		UNKNOWN_ERROR: 'wikilambda-unknown-save-error-message',
		MISSING_FUNCTION_OUTPUT: 'wikilambda-missing-function-output-error-message',
		MISSING_FUNCTION_INPUT_TYPE: 'wikilambda-missing-function-input-type-error-message',
		MISSING_TARGET_FUNCTION: 'wikilambda-zobject-missing-attached-function',
		MISSING_IMPLEMENTATION_COMPOSITION: 'wikilambda-zimplememntation-composition-missing',
		MISSING_IMPLEMENTATION_CODE: 'wikilambda-zimplementation-code-missing',
		MISSING_IMPLEMENTATION_CODE_LANGUAGE: 'wikilambda-zimplementation-code-language-missing',
		MISSING_TESTER_CALL: 'wikilambda-ztester-missing-call-function',
		MISSING_TESTER_VALIDATION: 'wikilambda-ztester-missing-validation-function',
		TYPED_LIST_TYPE_CHANGED: 'wikilambda-list-type-change-warning',
		FUNCTION_INPUT_OUTPUT_CHANGED: 'wikilambda-publish-input-and-output-changed-impact-prompt',
		FUNCTION_INPUT_CHANGED: 'wikilambda-publish-input-changed-impact-prompt',
		FUNCTION_OUTPUT_CHANGED: 'wikilambda-publish-output-changed-impact-prompt'
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
	},
	contextMenuItems = {
		ADD_LIST_ITEM: 'add_list_item',
		DELETE_LIST_ITEM: 'delete_list_item'
	},
	testerStatus = {
		READY: 'ready',
		PASSED: 'passed',
		FAILED: 'failed',
		RUNNING: 'running',
		CANCELED: 'canceled'
	},
	builtinComponents = {
		[ Constants.Z_FUNCTION_CALL ]: 'wl-z-function-call',
		[ Constants.Z_RESPONSEENVELOPE ]: 'wl-z-evaluation-result',
		[ Constants.Z_IMPLEMENTATION ]: 'wl-z-implementation',
		[ Constants.Z_TESTER ]: 'wl-z-tester',
		[ Constants.Z_MONOLINGUALSTRING ]: 'wl-z-monolingual-string',
		[ Constants.Z_STRING ]: 'wl-z-string',
		[ Constants.Z_REFERENCE ]: 'wl-z-reference',
		[ Constants.Z_BOOLEAN ]: 'wl-z-boolean',
		[ Constants.Z_CODE ]: 'wl-z-code',
		[ Constants.Z_TYPED_LIST ]: 'wl-z-typed-list'
	},
	linkedTypes = [
		Constants.Z_TYPE,
		Constants.Z_TESTER,
		Constants.Z_IMPLEMENTATION,
		Constants.Z_FUNCTION,
		Constants.Z_NATURAL_LANGUAGE
		// TODO (T296815): Constants.Z_PROGRAMMING_LANGUAGE
	],
	resolverTypes = [
		Constants.Z_REFERENCE,
		Constants.Z_FUNCTION_CALL,
		Constants.Z_ARGUMENT_REFERENCE
	];

Constants.Z_TYPED_OBJECTS_LIST = typedObjectsList;
Constants.VIEWS = views;
Constants.PATHS = paths;
Constants.ACTIONS = actions;
Constants.errorTypes = errorTypes;
Constants.errorCodes = errorCodes;
Constants.breakpoints = breakpoints;
Constants.breakpointsTypes = breakpointsTypes;
Constants.contextMenuItems = contextMenuItems;
Constants.testerStatus = testerStatus;
Constants.COLOR_NESTING_LEVELS = 6;
Constants.BUILTIN_COMPONENTS = builtinComponents;
Constants.RESOLVER_TYPES = resolverTypes;
Constants.LINKED_TYPES = linkedTypes;
Constants.API_LIMIT_MAX = 100;
Constants.ABOUT_DIALOG_MAX_ITEMS = 5;
Constants.LABEL_CHARS_MAX = 100;
Constants.DESCRIPTION_CHARS_MAX = 100;

Constants.ROW_VALUE_OBJECT = 'object';
Constants.ROW_VALUE_ARRAY = 'array';

module.exports = Constants;
