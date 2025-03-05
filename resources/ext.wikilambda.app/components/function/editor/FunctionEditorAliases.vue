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
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

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
	computed: Object.assign( {}, mapState( useMainStore, [
		'getZPersistentAlias'
	] ), {
		/**
		 * Finds the Alias set (Z2K4) for the given language and returns
		 * its keyPath and value if found. Else, returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		aliases: function () {
			return this.zLanguage ? this.getZPersistentAlias( this.zLanguage ) : undefined;
		},
		/**
		 * Returns whether there are any aliases for the selected language
		 *
		 * @return {boolean}
		 */
		hasAliases: function () {
			return this.aliases && this.aliases.value.length > 0;
		},
		/**
		 * Returns the label for the alias field
		 *
		 * @return {string}
		 */
		aliasLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			return this.$i18n( 'wikilambda-function-definition-alias-label' ).text();
		},
		/**
		 * Returns the label for the alias input field
		 *
		 * @return {string}
		 */
		aliasInputLabel: function () {
			return this.$i18n( 'wikilambda-function-definition-alias-label-new' ).text();
		},
		/**
		 * Returns the "optional" caption for the alias field
		 *
		 * @return {string}
		 */
		aliasOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the placeholder for the chip input field
		 * if there are no aliases for the selected language.
		 * Else, returns empty string.
		 *
		 * @return {string}
		 */
		aliasFieldPlaceholder: function () {
			return this.hasAliases ? '' :
				this.$i18n( 'wikilambda-function-definition-alias-placeholder' ).text();
		},
		/**
		 * Returns the description for the alias field
		 *
		 * @return {string}
		 */
		aliasFieldDescription: function () {
			return this.$i18n( 'wikilambda-function-definition-alias-description' ).text();
		},
		/**
		 * Returns the id for the alias field
		 *
		 * @return {string}
		 */
		aliasFieldId: function () {
			return `ext-wikilambda-app-function-editor-aliases__input${ this.zLanguage }`;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setZMonolingualStringset'
	] ), {
		/**
		 * Persists the aliases in the data store.
		 *
		 * @param {Array} aliases list of ChipInputItem objects, with the aliases to persist
		 */
		persistAlias: function ( aliases ) {
			this.setZMonolingualStringset( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				],
				itemKeyPath: this.aliases ? this.aliases.keyPath : undefined,
				value: aliases.map( ( alias ) => alias.value ),
				lang: this.zLanguage
			} );

			this.$emit( 'alias-updated' );
		}
	} )
} );
</script>
