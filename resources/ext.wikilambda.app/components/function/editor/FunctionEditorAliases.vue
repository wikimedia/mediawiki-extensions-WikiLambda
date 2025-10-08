<!--
	WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-aliases">
		<template #label>
			<label :for="aliasFieldId">
				{{ aliasLabel }}
				<span>{{ aliasOptional }}</span>
			</label>
		</template>
		<template #description>
			{{ aliasFieldDescription }}
		</template>
		<template #body>
			<cdx-chip-input
				:id="aliasFieldId"
				:aria-label="aliasInputLabel"
				:input-chips="aliases ? aliases.value.map( ( a ) => ( { value: a } ) ) : []"
				:placeholder="aliasFieldPlaceholder"
				@update:input-chips="persistAlias"
			></cdx-chip-input>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Codex components
const { CdxChipInput } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-aliases',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'cdx-chip-input': CdxChipInput
	},
	props: {
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
		zLanguage: {
			type: String,
			required: true
		}
	},
	emits: [ 'alias-updated' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		/**
		 * Finds the Alias set (Z2K4) for the given language
		 *
		 * @return {Object|undefined}
		 */
		const aliases = computed( () => props.zLanguage ? store.getZPersistentAlias( props.zLanguage ) : undefined );

		/**
		 * Returns whether there are any aliases for the selected language
		 *
		 * @return {boolean}
		 */
		const hasAliases = computed( () => aliases.value && aliases.value.value.length > 0 );

		/**
		 * Returns the label for the alias field
		 *
		 * TODO (T335583): Replace i18n message with key label
		 *
		 * @return {string}
		 */
		const aliasLabel = computed( () => i18n( 'wikilambda-function-definition-alias-label' ).text() );

		/**
		 * Returns the label for the alias input field
		 *
		 * @return {string}
		 */
		const aliasInputLabel = computed( () => i18n( 'wikilambda-function-definition-alias-label-new' ).text() );

		/**
		 * Returns the "optional" caption for the alias field
		 *
		 * @return {string}
		 */
		const aliasOptional = computed( () => i18n( 'parentheses', [ i18n( 'wikilambda-optional' ).text() ] ).text() );

		/**
		 * Returns the placeholder for the chip input field
		 *
		 * @return {string}
		 */
		const aliasFieldPlaceholder = computed( () => hasAliases.value ? '' :
			i18n( 'wikilambda-function-definition-alias-placeholder' ).text() );

		/**
		 * Returns the description for the alias field
		 *
		 * @return {string}
		 */
		const aliasFieldDescription = computed( () => i18n( 'wikilambda-function-definition-alias-description' ).text() );

		/**
		 * Returns the id for the alias field
		 *
		 * @return {string}
		 */
		const aliasFieldId = computed( () => `ext-wikilambda-app-function-editor-aliases__input${ props.zLanguage }` );

		/**
		 * Persists the aliases in the data store.
		 *
		 * @param {Array} aliasesArray list of ChipInputItem objects
		 */
		const persistAlias = ( aliasesArray ) => {
			store.setZMonolingualStringset( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				],
				itemKeyPath: aliases.value ? aliases.value.keyPath : undefined,
				value: aliasesArray.map( ( alias ) => alias.value ),
				lang: props.zLanguage
			} );

			emit( 'alias-updated' );
		};

		return {
			aliasFieldDescription,
			aliasFieldId,
			aliasFieldPlaceholder,
			aliasInputLabel,
			aliasLabel,
			aliasOptional,
			aliases,
			persistAlias
		};
	}
} );
</script>
