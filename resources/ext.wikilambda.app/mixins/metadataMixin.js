/**
 * WikiLambda Vue editor: Metadata dialog configuration mixin.
 * Mixin with the definition of how the information should be structured
 * and transformed in the Metadata Dialog component. This configuration
 * object is added in FunctionMetadataDialog.vue component as a mixin.
 * This component should implement all methods that are defined in this
 * structure under the description or the transform keys.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const metadataKeys = {
	errors: {
		title: 'wikilambda-functioncall-metadata-errors',
		description: 'getErrorSummary',
		open: true,
		keys: [
			{ key: 'errors', title: 'wikilambda-functioncall-metadata-errors-summary', transform: 'getErrorType' },
			{ key: 'validateErrors', title: 'wikilambda-functioncall-metadata-validator-errors-summary', transform: 'getErrorType' },
			{ key: 'expectedTestResult', title: 'wikilambda-functioncall-metadata-expected-result' },
			{ key: 'actualTestResult', title: 'wikilambda-functioncall-metadata-actual-result' },
			{ key: 'executorDebugLogs', title: 'wikilambda-functioncall-metadata-execution-debug-logs' }
		]
	},
	implementation: {
		title: 'wikilambda-functioncall-metadata-implementation',
		description: 'getImplementationSummary',
		keys: [
			{ key: 'implementationId', title: 'wikilambda-functioncall-metadata-implementation-name', transform: 'getImplementationLink' },
			{ key: 'implementationId', title: 'wikilambda-functioncall-metadata-implementation-id', transform: 'getStringValue' },
			{ key: 'implementationType', title: 'wikilambda-functioncall-metadata-implementation-type' }
		]
	},
	duration: {
		title: 'wikilambda-functioncall-metadata-duration',
		description: 'getDurationSummary',
		sections: [ {
			title: 'wikilambda-functioncall-metadata-orchestration',
			keys: [
				{ key: 'orchestrationDuration', title: 'wikilambda-functioncall-metadata-duration' },
				{ key: 'orchestrationStartTime', title: 'wikilambda-functioncall-metadata-start-time', transform: 'toRelativeTime' },
				{ key: 'orchestrationEndTime', title: 'wikilambda-functioncall-metadata-end-time', transform: 'toRelativeTime' }
			]
		}, {
			title: 'wikilambda-functioncall-metadata-evaluation',
			keys: [
				{ key: 'evaluationDuration', title: 'wikilambda-functioncall-metadata-duration' },
				{ key: 'evaluationStartTime', title: 'wikilambda-functioncall-metadata-start-time', transform: 'toRelativeTime' },
				{ key: 'evaluationEndTime', title: 'wikilambda-functioncall-metadata-end-time', transform: 'toRelativeTime' }
			]
		} ]
	},
	cpu: {
		title: 'wikilambda-functioncall-metadata-cpu-usage',
		description: 'getCpuUsageSummary',
		keys: [
			{ key: 'orchestrationCpuUsage', title: 'wikilambda-functioncall-metadata-orchestration' },
			{ key: 'evaluationCpuUsage', title: 'wikilambda-functioncall-metadata-evaluation' },
			{ key: 'executionCpuUsage', title: 'wikilambda-functioncall-metadata-execution' }
		]
	},
	memory: {
		title: 'wikilambda-functioncall-metadata-memory-usage',
		description: 'getMemoryUsageSummary',
		keys: [
			{ key: 'orchestrationMemoryUsage', title: 'wikilambda-functioncall-metadata-orchestration' },
			{ key: 'evaluationMemoryUsage', title: 'wikilambda-functioncall-metadata-evaluation' },
			{ key: 'executionMemoryUsage', title: 'wikilambda-functioncall-metadata-execution' }
		]
	},
	server: {
		title: 'wikilambda-functioncall-metadata-hostname',
		keys: [
			{ key: 'orchestrationHostname', title: 'wikilambda-functioncall-metadata-orchestration' },
			{ key: 'evaluationHostname', title: 'wikilambda-functioncall-metadata-evaluation' }
		]
	},
	programmingLanguage: {
		title: 'wikilambda-functioncall-metadata-programming-language',
		keys: [
			{ key: 'programmingLanguageVersion', title: 'wikilambda-functioncall-metadata-programming-language-version' }
		]
	}
};

module.exports = exports = {
	data: function () {
		return {
			metadataKeys: metadataKeys
		};
	}
};
