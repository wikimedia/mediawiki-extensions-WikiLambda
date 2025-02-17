<!--
	WikiLambda Vue component widget for exploring function details.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-function-explorer-widget" data-testid="function-explorer-widget">
		<template #header>
			{{ $i18n( 'wikilambda-function-explorer-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="edit"
				weight="quiet"
				class="ext-wikilambda-app-function-explorer-widget__button"
				:class="{ 'ext-wikilambda-app-function-explorer-widget__button--disabled': resetButtonDisabled }"
				:aria-label="$i18n( 'wikilambda-function-explorer-accessible-label' ).text()"
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
					ext-wikilambda-app-function-explorer-widget__function-name-wrapper">
					<h5 class="ext-wikilambda-app-function-explorer-widget__heading-no-spacing">
						{{ $i18n( 'wikilambda-function-explorer-name-title' ) }}
					</h5>
					<span
						v-if="implementation === Constants.Z_IMPLEMENTATION_CODE"
						class="ext-wikilambda-app-function-explorer-widget__copyable"
						:class="{ 'ext-wikilambda-app-function-explorer-widget__untitled': functionLabel.isUntitled }"
						data-testid="function-zid"
						@click.stop="copyToClipboard( functionZid )"
					>{{ showValueOrCopiedMessage( functionZid ) }}</span>
				</div>
				<!-- Edit mode -->
				<template v-if="edit">
					<wl-z-object-selector
						:type="Constants.Z_FUNCTION"
						:placeholder="$i18n( 'wikilambda-function-typeselector-label' ).text()"
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
						:href="getWikiUrl( currentFunctionZid )"
						data-testid="function-name"
						:lang="functionLabel.langCode"
						:dir="functionLabel.langDir"
					>
						{{ functionLabel.labelOrUntitled }}
					</a>
				</div>
			</section>

			<!-- Function details (inputs and outputs) -->
			<section v-if="functionExists && functionArguments.length">
				<div class="ext-wikilambda-app-function-explorer-widget__function-inputs-title-wrapper">
					<h5 class="ext-wikilambda-app-function-explorer-widget__heading-no-spacing">
						{{ $i18n( 'wikilambda-function-inputs-title' ).text() }}
					</h5>
				</div>

				<!-- TODO: Consider using v-memo to optimize -->
				<!-- Function inputs/arguments -->
				<div
					v-for="arg in functionArguments"
					:key="arg.key"
					class="ext-wikilambda-app-function-explorer-widget__function-inputs-wrapper"
				>
					<div
						class="ext-wikilambda-app-function-explorer-widget__flex
						ext-wikilambda-app-function-explorer-widget__space-between">
						<span
							class="ext-wikilambda-app-function-explorer-widget__type
							ext-wikilambda-app-function-explorer-widget__dark-links">
							<wl-type-to-string
								data-testid="function-input-type"
								:type="arg.type"
							></wl-type-to-string>
						</span>
						<span
							v-if="implementation === Constants.Z_IMPLEMENTATION_CODE"
							class="ext-wikilambda-app-function-explorer-widget__copyable"
							data-testid="function-input-zkey"
							data-title="Click to copy"
							@click.stop="copyToClipboard( arg.key )"
						>
							{{ showValueOrCopiedMessage( arg.key ) }}
						</span>
					</div>
					<span
						:class="{ 'ext-wikilambda-app-function-explorer-widget__untitled': arg.label.isUntitled }"
						data-testid="function-input-name"
						:lang="arg.label.langCode"
						:dir="arg.label.langDir"
					>
						{{ arg.label.label }}
					</span>
				</div>

				<div class="ext-wikilambda-app-function-explorer-widget__function-outputs-title-wrapper">
					<h5 class="ext-wikilambda-app-function-explorer-widget__heading-no-spacing">
						{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</h5>
					<span
						class="ext-wikilambda-app-function-explorer-widget__type
						ext-wikilambda-app-function-explorer-widget__dark-links">
						<wl-type-to-string
							data-testid="function-output"
							:type="outputType"
						></wl-type-to-string>
					</span>
				</div>
			</section>
		</template>
		<template v-if="edit && functionExists" #footer>
			<div class="ext-wikilambda-app-function-explorer-widget__footer-wrapper">
				<cdx-button
					class="ext-wikilambda-app-function-explorer-widget__button-view-function"
					action="progressive"
					data-testid="button-view-function"
					@click="navigateToFunction">
					{{ $i18n( 'wikilambda-function-view-function-button-text' ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxButton, CdxIcon } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const clipboardUtils = require( '../../../mixins/clipboardUtils.js' );
const icons = require( '../../../../lib/icons.json' );
const typeUtils = require( '../../../mixins/typeUtils.js' );
const useMainStore = require( '../../../store/index.js' );
const TypeToString = require( '../../base/TypeToString.vue' );
const WidgetBase = require( '../../base/WidgetBase.vue' );
const ZObjectSelector = require( '../../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-explorer-widget',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-type-to-string': TypeToString,
		'wl-widget-base': WidgetBase,
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils, clipboardUtils ],
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
	data() {
		return {
			currentFunctionZid: this.functionZid,
			initialFunctionObject: null,
			Constants: Constants,
			resetIcon: icons.cdxIconHistory
		};
	},
	computed: Object.assign(
		mapState( useMainStore, [
			'getUserLangCode',
			'getStoredObject',
			'getInputsOfFunctionZid',
			'getLabelData'
		] ),
		{
			/**
			 * Returns the LabelData object for the selected function Zid
			 *
			 * @return {LabelData}
			 */
			functionLabel: function () {
				return this.getLabelData( this.currentFunctionZid );
			},
			/**
			 * Returns the stored function object for the selected function Zid
			 *
			 * @return {Object}
			 */
			functionObject: function () {
				return this.getStoredObject( this.currentFunctionZid );
			},
			/**
			 * Returns the zid, type and LabelData object for each function
			 * argument given a selected function Zid
			 *
			 * @return {Array}
			 */
			functionArguments: function () {
				const args = this.getInputsOfFunctionZid( this.currentFunctionZid );

				return args.map( ( arg ) => {
					const key = arg[ Constants.Z_ARGUMENT_KEY ];
					const type = arg[ Constants.Z_ARGUMENT_TYPE ];
					const label = this.getLabelData( key );

					return {
						key,
						type,
						label
					};
				} );
			},
			/**
			 * Returns whether the function exists and has been fetched
			 *
			 * @return {boolean}
			 */
			functionExists: function () {
				return Boolean( this.functionObject );
			},
			/**
			 * Returns the output type of the selected function
			 *
			 * @return {Object|string}
			 */
			outputType: function () {
				return this.functionObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ];
			},
			/**
			 * Returns whether the reset button must be disabled (the
			 * selected function is the same as the initialized function)
			 *
			 * @return {boolean}
			 */
			resetButtonDisabled: function () {
				return this.currentFunctionZid === this.functionZid;
			}
		}
	),
	methods: {
		updateSelectedFunction( zIdSelected ) {
			this.currentFunctionZid = zIdSelected;
		},
		resetFunction() {
			this.currentFunctionZid = this.functionZid;
		},
		getWikiUrl( zid ) {
			return '/view/' + this.getUserLangCode + '/' + zid;
		},
		navigateToFunction() {
			window.open( this.getWikiUrl( this.currentFunctionZid ), '_blank' );
		}
	},
	created: function () {
		this.$watch(
			'functionObject',
			( newFunctionObject ) => {
				// Only update the initial function if a functionZid was provided
				if ( this.functionZid ) {
					this.initialFunctionObject = newFunctionObject || this.initialFunctionObject;
				}
			},
			{ immediate: true }
		);
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

	.ext-wikilambda-app-function-explorer-widget__heading-no-spacing {
		margin-top: 0;
		padding-top: 0;
	}

	.ext-wikilambda-app-function-explorer-widget__function-name-wrapper {
		margin-bottom: @spacing-25;
	}

	.ext-wikilambda-app-function-explorer-widget__function-inputs-wrapper:not( :last-child ) {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-function-explorer-widget__untitled {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-function-explorer-widget__function-inputs-title-wrapper,
	.ext-wikilambda-app-function-explorer-widget__function-outputs-title-wrapper {
		margin-top: @spacing-100;
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
		cursor: pointer;
	}

	.ext-wikilambda-app-function-explorer-widget__button-view-function {
		font-size: @wl-font-size-base;
	}

	.ext-wikilambda-app-function-explorer-widget__button--disabled {
		cursor: not-allowed;
	}
}
</style>
