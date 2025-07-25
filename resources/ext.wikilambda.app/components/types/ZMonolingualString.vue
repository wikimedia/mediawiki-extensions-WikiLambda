<!--
	WikiLambda Vue component for Z11/Monolingual String objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-monolingual-string" data-testid="z-monolingual-string">
		<!-- Monolingual string on view mode -->
		<div
			v-if="!edit"
			class="ext-wikilambda-app-monolingual-string__view-mode"
		>
			<cdx-info-chip
				class="ext-wikilambda-app-monolingual-string__chip"
				:class="{ 'ext-wikilambda-app-monolingual-string__chip--empty': hasEmptyLang }"
			>
				{{ langIso.toUpperCase() }}
			</cdx-info-chip>
			{{ text }}
		</div>
		<!-- Monolingual string on edit mode -->
		<div
			v-else
			class="ext-wikilambda-app-monolingual-string__edit-mode"
			:style="inputCssVariablesStyle"
		>
			<cdx-info-chip
				ref="chipComponent"
				class="ext-wikilambda-app-monolingual-string__chip"
				:class="{ 'ext-wikilambda-app-monolingual-string__chip--empty': hasEmptyLang }"
			>
				{{ langIso.toUpperCase() }}
			</cdx-info-chip>
			<cdx-text-input
				v-model="text"
				class="ext-wikilambda-app-monolingual-string__input"
				:placeholder="$i18n( 'wikilambda-edit-monolingual-text-placeholder' ).text()"
			>
			</cdx-text-input>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );

// Codex components
const { CdxInfoChip, CdxTextInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-monolingual-string',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-info-chip': CdxInfoChip
	},
	mixins: [ typeMixin, zobjectMixin ],
	props: {
		keyPath: { // eslint-disable-line vue/no-unused-properties
			type: String,
			required: true
		},
		objectValue: {
			type: [ String, Object ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			chipComponent: null,
			chipWidth: 72
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLanguageIsoCodeOfZLang'
	] ), {
		/**
		 * Computed value:
		 * 1. Getter gets the value from the state.
		 * 2. Setter informs the ZObjectKeyValue of the change.
		 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
		 * so only the ZObjectKeyValue is doing operations to transform
		 * the state data. This is so that we don't duplicate state mutation
		 * logic all over the components, and builtin components are just
		 * visual representations and have zero logic.
		 */
		text: {
			/**
			 * Returns the terminal value of the string represented
			 * in this component.
			 *
			 * @return {string}
			 */
			get: function () {
				return this.getZMonolingualTextValue( this.objectValue );
			},
			/**
			 * Emits a setValue event with the new value for the string
			 * and the key path information depending on the object key.
			 *
			 * @param {string} value
			 */
			set: function ( value ) {
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					],
					value
				} );
			}
		},

		/**
		 * Returns the language Zid of the Monolingual string
		 * object represented in this component, or the language code
		 * if lang is a literal.
		 *
		 * @return {string}
		 */
		lang: function () {
			return this.getZMonolingualLangValue( this.objectValue );
		},

		/**
		 * Return the text that identifies the language in which
		 * this Monolingual String is written.
		 * If lang is not a Zid but a laguage code, getLanguageIsoCodeOfZLang
		 * will return the input, so langIso should always be a language code.
		 *
		 * @return {string}
		 */
		langIso: function () {
			return this.getLanguageIsoCodeOfZLang( this.lang ) || '';
		},
		/**
		 * Returns the dynamically calculated width of the inner language chip
		 *
		 * @return {string}
		 */
		inputCssVariablesStyle: function () {
			return {
				'--chipWidthPx': `${ this.chipWidth }px`
			};
		},
		/**
		 * Whether the language is still not defined, so langIso is an empty string
		 *
		 * @return {boolean}
		 */
		hasEmptyLang: function () {
			return ( this.langIso === '' );
		}
	} ),
	methods: {
		getAndStoreChipWidth() {
			if ( !this.chipComponent ) {
				return;
			}
			this.chipWidth = this.chipComponent.$el.offsetWidth;
		}
	},
	watch: {
		langIso: {
			handler: function () {
				this.getAndStoreChipWidth();
			},
			immediate: true,
			flush: 'post'
		}
	},
	mounted() {
		this.chipComponent = this.$refs.chipComponent;
		this.getAndStoreChipWidth();
	}
} );

</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-monolingual-string {
	.ext-wikilambda-app-monolingual-string__chip {
		min-width: 32px;

		&--empty {
			border: 1px dashed @border-color-base;
			height: 22px;
		}
	}

	.ext-wikilambda-app-monolingual-string__view-mode {
		margin: 0;
		color: @color-base;
		display: flex;
		flex-direction: row;
		align-items: baseline;
		word-break: break-word;

		.ext-wikilambda-app-monolingual-string__chip {
			margin-right: @spacing-50;
		}
	}

	.ext-wikilambda-app-monolingual-string__edit-mode {
		min-height: @min-size-interactive-pointer;
		display: flex;
		flex-direction: row;
		align-items: center;
		position: relative;
		z-index: 3;

		.ext-wikilambda-app-monolingual-string__chip {
			position: absolute;
			z-index: 3;
			left: @spacing-50;
		}
	}

	.ext-wikilambda-app-monolingual-string__input {
		// The input should be aligned with the chip
		.cdx-text-input__input {
			--spacing-50: @spacing-50;
			padding-left: ~'calc( var(--spacing-50) + var(--chipWidthPx) + var(--spacing-50) )';
		}
	}
}
</style>
