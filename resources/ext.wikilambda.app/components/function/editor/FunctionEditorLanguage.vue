<!--
	WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-language">
		<template #label>
			<label id="ext-wikilambda-app-function-editor-language__label-id">
				<!-- TODO (T335583): Replace i18n message with key label -->
				{{ i18n( 'wikilambda-languagelabel' ).text() }}
			</label>
		</template>
		<template #body>
			<wl-z-object-selector
				class="ext-wikilambda-app-function-editor-language__add-language"
				aria-labelledby="ext-wikilambda-app-function-editor-language__label-id"
				:disabled="hasContent"
				:exclude-zids="excludedLanguages"
				:selected-zid="zLanguage"
				:type="naturalLanguageType"
				@select-item="addNewLanguage"
			></wl-z-object-selector>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Base components
const ZObjectSelector = require( '../../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-language',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		zLanguage: {
			type: String,
			default: ''
		},
		functionLanguages: {
			type: Array,
			default: () => []
		},
		index: {
			type: Number,
			default: 0
		}
	},
	emits: [ 'language-changed' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const naturalLanguageType = Constants.Z_NATURAL_LANGUAGE;

		/**
		 * Returns the list of languages that should be excluded from selection.
		 * Excludes languages already selected in other language blocks (excluding current block).
		 *
		 * @return {Array}
		 */
		const excludedLanguages = computed( () => props.functionLanguages
			.filter( ( _, index ) => index !== props.index )
		);
		/**
		 * Whether the language selector should be disabled.
		 * Disabled when content has been entered in any field (name, description, aliases, or input labels).
		 * The selector is enabled when the language is not set or when the content is empty.
		 *
		 * @return {boolean}
		 */
		const hasContent = computed( () => {
			if ( !props.zLanguage ) {
				return false;
			}

			// Check if name has content
			const name = store.getZPersistentName( props.zLanguage );
			if ( name && name.value && name.value.trim() !== '' ) {
				return true;
			}

			// Check if description has content
			const description = store.getZPersistentDescription( props.zLanguage );
			if ( description && description.value && description.value.trim() !== '' ) {
				return true;
			}

			// Check if aliases have content
			const aliases = store.getZPersistentAlias( props.zLanguage );
			if ( aliases && aliases.value && aliases.value.length > 0 ) {
				return true;
			}

			// Check if any input labels have content
			const inputs = store.getZFunctionInputLabels( props.zLanguage );
			if ( inputs && inputs.length > 0 ) {
				for ( const input of inputs ) {
					if ( input.value && input.value.trim() !== '' ) {
						return true;
					}
				}
			}

			return false;
		} );

		/**
		 * Emits a change event when the selector is set to a new language.
		 *
		 * @param {string} lang
		 */
		function addNewLanguage( lang ) {
			emit( 'language-changed', lang );
		}

		return {
			i18n,
			addNewLanguage,
			excludedLanguages,
			hasContent,
			naturalLanguageType
		};
	}
} );
</script>
