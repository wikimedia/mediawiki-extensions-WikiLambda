<!--
	WikiLambda Vue component widget for exploring function details.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-function-explorer-widget" data-testid="function-explorer-widget">
		<template #header>
			{{ i18n( 'wikilambda-function-explorer-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="edit"
				weight="quiet"
				class="ext-wikilambda-app-function-explorer-widget__button"
				:class="{ 'ext-wikilambda-app-function-explorer-widget__button--disabled': resetButtonDisabled }"
				:aria-label="i18n( 'wikilambda-function-explorer-accessible-label' ).text()"
				:disabled="resetButtonDisabled"
				data-testid="function-explorer-reset-button"
				@click="resetFunction"
			>
				<cdx-icon :icon="resetIcon"></cdx-icon>
			</cdx-button>
		</template>

		<template #main>
			<!-- Function name & lookup -->
			<section>
				<div
					class="ext-wikilambda-app-function-explorer-widget__flex
					ext-wikilambda-app-function-explorer-widget__space-between
					ext-wikilambda-app-function-explorer-widget__function-name-title">
					<wl-key-block :key-bold="true">
						{{ i18n( 'wikilambda-function-explorer-name-title' ) }}
					</wl-key-block>
					<button
						v-if="implementation === implementationCode"
						type="button"
						class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-explorer-widget__copyable"
						:class="{ 'ext-wikilambda-app-function-explorer-widget__untitled': functionLabel.isUntitled }"
						data-testid="function-zid"
						:aria-label="showValueOrCopiedMessage( currentFunctionZid ) === getCopiedText ?
							i18n( 'wikilambda-function-explorer-copied-aria-text', currentFunctionZid ).text() :
							i18n( 'wikilambda-function-explorer-copy-zid', currentFunctionZid ).text()"
						aria-live="polite"
						aria-atomic="true"
						@click.stop="copyToClipboard( currentFunctionZid )"
					>
						{{ showValueOrCopiedMessage( currentFunctionZid ) }}
					</button>
				</div>
				<!-- Edit mode -->
				<template v-if="edit">
					<wl-z-object-selector
						:key="currentFunctionZid"
						:type="functionType"
						:placeholder="i18n( 'wikilambda-function-typeselector-label' ).text()"
						:selected-zid="currentFunctionZid"
						data-testid="function-selector"
						@select-item="updateSelectedFunction"
					>
					</wl-z-object-selector>
				</template>
				<!-- Read mode -->
				<div
					v-else
					class="ext-wikilambda-app-function-explorer-widget__flex
						ext-wikilambda-app-function-explorer-widget__space-between
						ext-wikilambda-app-function-explorer-widget__dark-links"
				>
					<a
						:href="functionUrl"
						data-testid="function-name"
						:lang="functionLabel.langCode"
						:dir="functionLabel.langDir"
					>
						{{ functionLabel.labelOrUntitled }}
					</a>
				</div>
			</section>

			<!-- Function details (inputs and outputs) -->
			<section
				v-if="functionExists && functionArguments.length"
				class="ext-wikilambda-app-function-explorer-widget__function-inputs">
				<wl-key-block
					:key-bold="true"
					class="ext-wikilambda-app-function-explorer-widget__function-inputs-title">
					{{ i18n( 'wikilambda-function-inputs-title' ).text() }}
				</wl-key-block>

				<!-- Function inputs/arguments -->
				<ul
					class="ext-wikilambda-app-list-reset
						ext-wikilambda-app-function-explorer-widget__function-inputs-list">
					<li
						v-for="arg in functionArguments"
						:key="arg.key"
						class="ext-wikilambda-app-function-explorer-widget__function-inputs-list-item"
					>
						<div
							class="ext-wikilambda-app-function-explorer-widget__flex
							ext-wikilambda-app-function-explorer-widget__space-between">
							<span
								class="ext-wikilambda-app-function-explorer-widget__type
								ext-wikilambda-app-function-explorer-widget__dark-links">
								<wl-z-object-to-string
									data-testid="function-input-type"
									:key-path="`function-explorer-input-${arg.key}`"
									:object-value="arg.type"
									:edit="edit"
								></wl-z-object-to-string>
							</span>
							<button
								v-if="implementation === implementationCode"
								type="button"
								class="ext-wikilambda-app-button-reset
									ext-wikilambda-app-function-explorer-widget__copyable"
								data-testid="function-input-zkey"
								:aria-label="showValueOrCopiedMessage( arg.key ) === getCopiedText ?
									i18n( 'wikilambda-function-explorer-copied-aria-text', arg.key ).text() :
									i18n( 'wikilambda-function-explorer-copy-key', arg.key ).text()"
								aria-live="polite"
								aria-atomic="true"
								@click.stop="copyToClipboard( arg.key )"
							>
								{{ showValueOrCopiedMessage( arg.key ) }}
							</button>
						</div>
						<span
							:class="{ 'ext-wikilambda-app-function-explorer-widget__untitled': arg.label.isUntitled }"
							data-testid="function-input-name"
							:lang="arg.label.langCode"
							:dir="arg.label.langDir"
						>
							{{ arg.label.label }}
						</span>
					</li>
				</ul>

				<div class="ext-wikilambda-app-function-explorer-widget__function-output">
					<wl-key-block
						:key-bold="true"
						class="ext-wikilambda-app-function-explorer-widget__function-output-title">
						{{ i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</wl-key-block>
					<span
						class="ext-wikilambda-app-function-explorer-widget__type
						ext-wikilambda-app-function-explorer-widget__dark-links">
						<wl-z-object-to-string
							data-testid="function-output"
							key-path="function-explorer-output"
							:object-value="outputType"
							:edit="edit"
						></wl-z-object-to-string>
					</span>
				</div>
			</section>
		</template>
		<template #footer>
			<div v-if="edit && functionExists" class="ext-wikilambda-app-function-explorer-widget__footer-wrapper">
				<cdx-button
					class="ext-wikilambda-app-function-explorer-widget__button-view-function"
					action="progressive"
					data-testid="button-view-function"
					@click="navigateToFunction">
					{{ i18n( 'wikilambda-function-view-function-button-text' ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const useMainStore = require( '../../../store/index.js' );
const useClipboard = require( '../../../composables/useClipboard.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );
const { extractZIDs } = require( '../../../utils/schemata.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
const KeyBlock = require( '../../base/KeyBlock.vue' );
const ZObjectSelector = require( '../../base/ZObjectSelector.vue' );
// Type components
const ZObjectToString = require( '../../types/ZObjectToString.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-explorer-widget',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-key-block': KeyBlock,
		'wl-widget-base': WidgetBase,
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-object-to-string': ZObjectToString
	},
	props: {
		edit: {
			type: Boolean,
			default: false
		},
		/** The default function object selected for this component */
		functionZid: {
			type: String,
			required: false,
			default: ''
		},
		implementation: {
			type: String,
			default: null
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { copyToClipboard, showValueOrCopiedMessage, getCopiedText } = useClipboard();

		// Constants
		const functionType = Constants.Z_FUNCTION;
		const implementationCode = Constants.Z_IMPLEMENTATION_CODE;
		const resetIcon = icons.cdxIconHistory;

		// State
		const currentFunctionZid = ref( props.functionZid );

		// Function data
		/**
		 * Returns the LabelData object for the selected function Zid
		 *
		 * @return {LabelData}
		 */
		const functionLabel = computed( () => store.getLabelData( currentFunctionZid.value ) );

		/**
		 * Returns the stored function object for the selected function Zid
		 *
		 * @return {Object}
		 */
		const functionObject = computed( () => store.getStoredObject( currentFunctionZid.value ) );

		/**
		 * Returns whether the function exists and has been fetched
		 *
		 * @return {boolean}
		 */
		const functionExists = computed( () => Boolean( functionObject.value ) );

		/**
		 * Returns the url for the selected function
		 *
		 * @return {string}
		 */
		const functionUrl = computed( () => urlUtils.generateViewUrl( {
			langCode: store.getUserLangCode,
			zid: currentFunctionZid.value
		} ) );

		/**
		 * Returns the output type of the selected function
		 *
		 * @return {Object|string|undefined}
		 */
		const outputType = computed( () => {
			if ( !functionObject.value ) {
				return undefined;
			}
			return functionObject.value[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_FUNCTION_RETURN_TYPE ];
		} );

		/**
		 * Returns the zid, type and LabelData object for each function
		 * argument given a selected function Zid
		 *
		 * @return {Array}
		 */
		const functionArguments = computed( () => {
			const args = store.getInputsOfFunctionZid( currentFunctionZid.value );

			return args.map( ( arg ) => {
				const key = arg[ Constants.Z_ARGUMENT_KEY ];
				const type = arg[ Constants.Z_ARGUMENT_TYPE ];
				const label = store.getLabelData( key );

				return {
					key,
					label,
					type
				};
			} );
		} );

		// UI display
		/**
		 * Returns whether the reset button must be disabled (the
		 * selected function is the same as the initialized function)
		 *
		 * @return {boolean}
		 */
		const resetButtonDisabled = computed( () => currentFunctionZid.value === props.functionZid );

		// Actions
		/**
		 * Updates the selected function to the provided Zid.
		 *
		 * @param {string} selectedZid - The Zid of the selected function
		 */
		function updateSelectedFunction( selectedZid ) {
			currentFunctionZid.value = selectedZid;
		}

		/**
		 * Resets the selected function to the initial function.
		 */
		function resetFunction() {
			currentFunctionZid.value = props.functionZid;
		}

		/**
		 * Navigates to the function URL in a new tab.
		 */
		function navigateToFunction() {
			window.open( functionUrl.value, '_blank' );
		}

		// Watch
		watch( () => props.functionZid, () => {
			resetFunction();
		} );

		watch( functionObject, ( newObject ) => {
			if ( !newObject ) {
				return;
			}

			const value = newObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( !value ) {
				return;
			}

			// Collect input and output types, and gather all involved zids
			const inputTypes = ( value[ Constants.Z_FUNCTION_ARGUMENTS ] || [] ).slice( 1 )
				.map( ( arg ) => arg[ Constants.Z_ARGUMENT_TYPE ] );
			const functionTypes = [ value[ Constants.Z_FUNCTION_RETURN_TYPE ], ...inputTypes ];

			const zids = extractZIDs( functionTypes );
			store.fetchZids( { zids } );
		}, { immediate: true } );

		return {
			copyToClipboard,
			currentFunctionZid,
			functionArguments,
			functionExists,
			functionLabel,
			functionType,
			functionUrl,
			getCopiedText,
			implementationCode,
			navigateToFunction,
			outputType,
			resetButtonDisabled,
			resetFunction,
			resetIcon,
			showValueOrCopiedMessage,
			updateSelectedFunction,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-explorer-widget {
	.ext-wikilambda-app-function-explorer-widget__dark-links {
		a {
			color: @color-base;
		}
	}

	.ext-wikilambda-app-function-explorer-widget__function-inputs-title,
	.ext-wikilambda-app-function-explorer-widget__function-output-title,
	.ext-wikilambda-app-function-explorer-widget__function-name-title {
		margin-bottom: @spacing-25;
	}

	.ext-wikilambda-app-function-explorer-widget__function-inputs,
	.ext-wikilambda-app-function-explorer-widget__function-output {
		margin-top: @spacing-100;
	}

	.ext-wikilambda-app-function-explorer-widget__function-inputs-list-item:not( :last-child ) {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-function-explorer-widget__untitled {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-function-explorer-widget__flex {
		display: flex;
		align-items: center;
	}

	.ext-wikilambda-app-function-explorer-widget__space-between {
		justify-content: space-between;
	}

	.ext-wikilambda-app-function-explorer-widget__copyable {
		font-family: @font-family-monospace;
	}

	.ext-wikilambda-app-function-explorer-widget__button--disabled {
		cursor: not-allowed;
	}

	.ext-wikilambda-app-function-explorer-widget__footer-wrapper {
		margin-top: @spacing-100;
	}
}
</style>
