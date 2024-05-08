<!--
	WikiLambda Vue component widget for exploring function details.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-function-explorer">
		<template #header>
			{{ $i18n( 'wikilambda-function-explorer-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="edit"
				weight="quiet"
				:class="{ 'ext-wikilambda-function-explorer-disabled': resetButtonDisabled }"
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
					class="ext-wikilambda-function-explorer-flex ext-wikilambda-function-explorer-space-between
					ext-wikilambda-function-explorer-function-name-wrapper">
					<h5 class="ext-wikilambda-function-explorer-heading-no-spacing">
						{{ $i18n( 'wikilambda-function-explorer-name-title' ) }}
					</h5>
					<span
						v-if="implementation === Constants.Z_IMPLEMENTATION_CODE"
						class="ext-wikilambda-function-explorer-copyable"
						:class="{ 'ext-wikilambda-function-explorer-untitled': functionisUntitled }"
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
						@input="updateSelectedFunction"
					>
					</wl-z-object-selector>
				</template>
				<!-- Read mode -->
				<div
					v-else
					class="ext-wikilambda-function-explorer-flex
						ext-wikilambda-function-explorer-space-between
						ext-wikilambda-function-explorer-dark-links"
				>
					<a
						:href="getWikiUrl( currentFunctionZid )"
						data-testid="function-name"
					>
						{{ functionName }}
					</a>
				</div>
			</section>

			<!-- Function details (inputs and outputs) -->
			<section v-if="functionExists && functionArguments.length">
				<div class="ext-wikilambda-function-explorer-function-inputs-title-wrapper">
					<h5 class="ext-wikilambda-function-explorer-heading-no-spacing">
						{{ $i18n( 'wikilambda-function-inputs-title' ).text() }}
					</h5>
				</div>

				<!-- TODO: Consider using v-memo to optimize -->
				<!-- Function inputs/arguments -->
				<div
					v-for="arg in functionArguments"
					:key="arg.label"
					class="ext-wikilambda-function-explorer-function-inputs-wrapper"

				>
					<div class="ext-wikilambda-function-explorer-flex ext-wikilambda-function-explorer-space-between">
						<span class="ext-wikilambda-function-explorer-type ext-wikilambda-function-explorer-dark-links">
							<wl-type-to-string
								data-testid="function-input-type"
								:type="arg.type"
							></wl-type-to-string>
						</span>
						<span
							v-if="implementation === Constants.Z_IMPLEMENTATION_CODE"
							class="ext-wikilambda-function-explorer-copyable"
							data-testid="function-input-zkey"
							data-title="Click to copy"
							@click.stop="copyToClipboard( arg.keyZid )"
						>
							{{ showValueOrCopiedMessage( arg.keyZid ) }}
						</span>
					</div>
					<span
						:class="{ 'ext-wikilambda-function-explorer-untitled': arg.isUntitled }"
						data-testid="function-input-name"
					>
						{{ arg.label }}
					</span>
				</div>

				<div class="ext-wikilambda-function-explorer-function-outputs-title-wrapper">
					<h5 class="ext-wikilambda-function-explorer-heading-no-spacing">
						{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</h5>
					<span class="ext-wikilambda-function-explorer-type ext-wikilambda-function-explorer-dark-links">
						<wl-type-to-string
							data-testid="function-output"
							:type="outputType"
						></wl-type-to-string>
					</span>
				</div>
			</section>
		</template>
		<template v-if="edit && functionExists" #footer>
			<div class="ext-wikilambda-function-explorer-footer-wrapper">
				<cdx-button
					class="ext-wikilambda-function-explorer-button-view-function"
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
const
	Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	WidgetBase = require( '../base/WidgetBase.vue' ),
	TypeToString = require( '../base/TypeToString.vue' ),
	ZObjectSelector = require( '../base/ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	icons = require( '../../../lib/icons.json' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-explorer',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-type-to-string': TypeToString,
		'wl-widget-base': WidgetBase,
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
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
			resetIcon: icons.cdxIconHistory,
			itemsCopied: []
		};
	},
	computed: $.extend(
		mapGetters( [
			'getUserLangCode',
			'getStoredObject',
			'getInputsOfFunctionZid',
			'getLabelData'
		] ),
		{
			functionIsUntitled: function () {
				return this.getLabelOrUntitledObject( this.currentFunctionZid ).isUntitled;
			},
			functionName: function () {
				return this.getLabelOrUntitledObject( this.currentFunctionZid ).text;
			},
			functionObject: function () {
				return this.getStoredObject( this.currentFunctionZid );
			},
			functionArguments: function () {
				const args = this.getInputsOfFunctionZid( this.currentFunctionZid );

				if ( !args ) {
					return [];
				}

				return args.map( ( arg ) => {
					const keyZid = arg[ Constants.Z_ARGUMENT_KEY ];

					const argLabelObject = this.getLabelOrUntitledObject( keyZid );
					const label = argLabelObject.text;
					const isUntitled = argLabelObject.isUntitled;

					return {
						label,
						isUntitled,
						keyZid,
						type: arg[ Constants.Z_ARGUMENT_TYPE ]
					};
				} );
			},
			functionExists: function () {
				return Boolean( this.functionObject );
			},
			outputType: function () {
				return this.functionObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ];
			},
			resetButtonDisabled: function () {
				return this.currentFunctionZid === this.functionZid;
			}
		}
	),
	methods: {
		/**
		 * Gets and returns a label for a given zid if found. Otherwise returns the equivalent of 'Untitled'
		 *
		 * @param {string} zid
		 * @return {string}
		 */
		getLabelOrUntitledObject( zid ) {
			const labelData = this.getLabelData( zid );

			return {
				isUntitled: !labelData,
				text: labelData ? labelData.label : this.$i18n( 'wikilambda-editor-default-name' ).text()
			};
		},
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
		},
		copyToClipboard( value ) {
			navigator.clipboard.writeText( value );

			// This will allow us to display a "copied" message for a short time
			this.itemsCopied.push( value );

			setTimeout( () => {
				this.itemsCopied.shift();
			}, 2000 );
		},
		showValueOrCopiedMessage( value ) {
			if ( this.itemsCopied.includes( value ) ) {
				return this.$i18n( 'wikilambda-function-explorer-copied-text' ).text();
			}

			return value;
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
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-explorer {
	.cdx-lookup {
		min-width: fit-content;
	}

	.cdx-text-input {
		.cdx-text-input__input {
			min-width: fit-content;
		}
	}

	.ext-wikilambda-function-explorer-dark-links {
		a,
		a:visited,
		a:hover,
		a:active {
			color: @color-base;
		}
	}

	.ext-wikilambda-function-explorer-heading-no-spacing {
		margin-top: 0;
		padding-top: 0;
	}

	.ext-wikilambda-function-explorer-function-name-wrapper {
		margin-bottom: @spacing-25;
	}

	.ext-wikilambda-function-explorer-function-inputs-wrapper:not( :last-child ) {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-function-explorer-untitled {
		color: @color-placeholder;
	}

	.ext-wikilambda-function-explorer-function-inputs-title-wrapper,
	.ext-wikilambda-function-explorer-function-outputs-title-wrapper {
		margin-top: @spacing-100;
	}

	.ext-wikilambda-function-explorer-flex {
		display: flex;
		align-items: center;
	}

	.ext-wikilambda-function-explorer-space-between {
		justify-content: space-between;
	}

	.ext-wikilambda-function-explorer-copyable {
		font-family: @font-family-monospace;
		cursor: pointer;
	}

	.ext-wikilambda-function-explorer-button-view-function {
		font-size: @wl-font-size-base;
	}

	.ext-wikilambda-function-explorer-disabled {
		cursor: not-allowed;
	}
}
</style>
