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
				:model-value="text"
				class="ext-wikilambda-app-monolingual-string__input"
				:placeholder="i18n( 'wikilambda-edit-monolingual-text-placeholder' ).text()"
				@update:model-value="setText"
			>
			</cdx-text-input>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useZObject = require( '../../composables/useZObject.js' );

// Codex components
const { CdxInfoChip, CdxTextInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-monolingual-string',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-info-chip': CdxInfoChip
	},
	props: {
		keyPath: {
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
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { getZMonolingualTextValue, getZMonolingualLangValue } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		const chipComponent = ref( null );
		const chipWidth = ref( 72 );

		// Computed properties
		/**
		 * Returns the terminal value of the string represented
		 * in this component.
		 *
		 * @return {string}
		 */
		const text = computed( () => getZMonolingualTextValue( props.objectValue ) );

		/**
		 * Sets the text value by emitting a setValue event.
		 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
		 * so only the ZObjectKeyValue is doing operations to transform
		 * the state data. This is so that we don't duplicate state mutation
		 * logic all over the components, and builtin components are just
		 * visual representations and have zero logic.
		 *
		 * @param {string} value
		 */
		function setText( value ) {
			emit( 'set-value', {
				keyPath: [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				],
				value
			} );
		}

		/**
		 * Returns the language Zid of the Monolingual string
		 * object represented in this component, or the language code
		 * if lang is a literal.
		 *
		 * @return {string}
		 */
		const lang = computed( () => getZMonolingualLangValue( props.objectValue ) );

		/**
		 * Return the text that identifies the language in which
		 * this Monolingual String is written.
		 * If lang is not a Zid but a laguage code, getLanguageIsoCodeOfZLang
		 * will return the input, so langIso should always be a language code.
		 *
		 * @return {string}
		 */
		const langIso = computed( () => store.getLanguageIsoCodeOfZLang( lang.value ) || '' );

		/**
		 * Returns the dynamically calculated width of the inner language chip
		 *
		 * @return {string}
		 */
		const inputCssVariablesStyle = computed( () => ( {
			'--chipWidthPx': `${ chipWidth.value }px`
		} ) );

		/**
		 * Whether the language is still not defined, so langIso is an empty string
		 *
		 * @return {boolean}
		 */
		const hasEmptyLang = computed( () => langIso.value === '' );

		// Methods
		function getAndStoreChipWidth() {
			if ( !chipComponent.value ) {
				return;
			}
			chipWidth.value = chipComponent.value.$el.offsetWidth;
		}

		// Watchers
		watch( langIso, () => {
			getAndStoreChipWidth();
		}, {
			immediate: true,
			flush: 'post'
		} );

		// Lifecycle
		onMounted( () => {
			getAndStoreChipWidth();
		} );

		return {
			chipComponent,
			hasEmptyLang,
			inputCssVariablesStyle,
			langIso,
			setText,
			text,
			i18n
		};
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
		}

		&--empty::before {
			content: '\200B';
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
