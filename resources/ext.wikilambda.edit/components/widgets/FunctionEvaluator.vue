<template>
	<!--
		WikiLambda Vue component for evaluation of ZFunction objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<wl-widget-base
		class="ext-wikilambda-function-evaluator"
		:has-footer-action="true"
	>
		<template #header>
			{{ $i18n( 'wikilambda-persistentobject-evaluate-function' ).text() }}
		</template>

		<template #main>
			<!-- Function Call -->
			<div class="ext-wikilambda-function-evaluator-call">
				<div class="ext-wikilambda-key-block">
					<label>{{ functionCallLabel }}</label>
				</div>
				<wl-z-object-key-value
					v-if="hasFunctionCall"
					:row-id="functionCallRowId"
					:edit="true"
				></wl-z-object-key-value>
			</div>

			<!-- Evaluation Result -->
			<div
				class="ext-wikilambda-function-evaluator-result"
			>
				<div class="ext-wikilambda-key-block">
					<label>{{ $i18n( 'wikilambda-orchestrated' ).text() }}</label>
				</div>
				<wl-z-object-key-value
					v-if="hasResult"
					:row-id="resultRowId"
					:edit="false"
				></wl-z-object-key-value>
				<div v-else>
					<div class="ext-wikilambda-function-evaluator-result-status">
						{{ orchestratorStatusMessage }}
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<cdx-button
				class="ext-wikilambda-function-evaluator-clear-button"
				:disabled="!hasResult"
				@click="clearResult"
			>
				<!-- TODO (T317556): internationalize when we have final design -->
				Clear
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-function-evaluator-run-button"
				:disabled="!hasImplementations"
				@click="callFunction"
			>
				{{ $i18n( 'wikilambda-call-function' ).text() }}
			</cdx-button>
		</template>
	</wl-widget-base>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	WidgetBase = require( '../base/WidgetBase.vue' ),
	ZObjectKeyValue = require( '../default-view-types/ZObjectKeyValue.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-function-evaluator',
	components: {
		'cdx-button': CdxButton,
		'wl-widget-base': WidgetBase,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	props: {
		functionZid: {
			type: String,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			functionCallRowId: '',
			resultRowId: '',
			orchestrating: false,
			hasResult: false
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getZFunctionCallFunctionId',
		'getAttachedImplementations',
		'getZObjectAsJsonById'
	] ), {
		/**
		 * Returns the selected function in the function call component
		 *
		 * @return {string | undefined}
		 */
		selectedFunctionZid: function () {
			return this.getZFunctionCallFunctionId( this.functionCallRowId );
		},

		/**
		 * Returns the array of implementation IDs for the selected function
		 *
		 * @return {Array}
		 */
		implementations: function () {
			return this.selectedFunctionZid ? this.getAttachedImplementations( this.selectedFunctionZid ) : [];
		},

		/**
		 * Returns whether the selected Function has any implementations
		 * and hence it can be run.
		 *
		 * @return {boolean}
		 */
		hasImplementations: function () {
			return this.implementations.length > 0;
		},

		/**
		 * Returns whether the detached Function Call object is initialized
		 *
		 * @return {boolean}
		 */
		hasFunctionCall: function () {
			return !!this.functionCallRowId;
		},

		/**
		 * Returns the human readable lable for Function Call/Z7
		 *
		 * @return {string}
		 */
		functionCallLabel: function () {
			return this.getLabel( Constants.Z_FUNCTION_CALL );
		},

		/**
		 * Returns message for the Orchestration result section when there's
		 * no result available: either the orchestration is loading or it's empty.
		 *
		 * @return {string}
		 */
		orchestratorStatusMessage: function () {
			return this.orchestrating ?
				this.$i18n( 'wikilambda-orchestrated-loading' ).text() :
				'-';
		}
	} ),
	methods: $.extend( mapActions( [
		'initializeResultId',
		'changeType',
		'callZFunction',
		'setZFunctionCallArguments'
	] ), {

		/**
		 * Clears the orchestration result object
		 */
		clearResult: function () {
			this.hasResult = false;
			this.orchestrating = false;
			this.initializeResultId( this.resultRowId );
		},

		/**
		 * Performs the function call
		 */
		callFunction: function () {
			const functionCallJson = this.getZObjectAsJsonById( this.functionCallRowId );
			this.orchestrating = true;
			this.initializeResultId( this.resultRowId )
				.then( ( rowId ) => {
					this.resultRowId = rowId;
					return this.callZFunction( {
						zobject: functionCallJson,
						resultId: this.resultRowId
					} );
				} )
				.then( () => {
					this.orchestrating = false;
					this.hasResult = true;
				} );
		},

		/**
		 * Initializes the detached objects in the zobject table
		 * that will contain:
		 * 1. The function call object, and
		 * 2. The evaluator result object returned from the call
		 *
		 * @param {string|undefined} initialFunctionZid
		 */
		initializeDetachedObjects: function ( initialFunctionZid ) {
			let functionCallRowId, resultRowId;
			// Initialize detached object for the function call
			this.initializeResultId( this.functionCallRowId ).then( ( rowId ) => {
				functionCallRowId = rowId;
				// Set the Function Call scaffolding and, if initial
				// function Zid is available, set its arguments
				return this.changeType( {
					type: Constants.Z_FUNCTION_CALL,
					id: rowId,
					value: initialFunctionZid || ''
				} ).then( () => {
					if ( initialFunctionZid ) {
						this.setZFunctionCallArguments( {
							parentId: rowId,
							functionZid: initialFunctionZid
						} );
					}
				} );
			} ).then( () => {
				// Initialize detached object for the result
				return this.initializeResultId( this.resultRowId ).then( ( rowId ) => {
					resultRowId = rowId;
				} );
			} ).finally( () => {
				// Set both detached rowIds to render the components
				this.functionCallRowId = functionCallRowId;
				this.resultRowId = resultRowId;
			} );
		}
	} ),
	watch: {
		selectedFunctionZid: function () {
			this.clearResult();
		}
	},
	mounted: function () {
		this.initializeDetachedObjects( this.functionZid );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-evaluator {
	.ext-wikilambda-function-evaluator-call {
		margin-bottom: @spacing-125;

		> .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}

		> .ext-wikilambda-key-value {
			> .ext-wikilambda-value-block {
				> .ext-wikilambda-key-value-set {
					> .ext-wikilambda-key-value:first-child {
						display: none;
					}
				}
			}
		}
	}

	.ext-wikilambda-function-evaluator-result {
		margin-bottom: @spacing-125;

		> .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}
}
</style>
