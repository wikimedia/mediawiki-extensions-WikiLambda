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
				:input-chips="aliases"
				:placeholder="aliasFieldPlaceholder"
				@update:input-chips="persistAliases"
			></cdx-chip-input>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { CdxChipInput } = require( '../../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const FunctionEditorField = require( './FunctionEditorField.vue' );
const useMainStore = require( '../../../store/index.js' );

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
		'getRowByKeyPath',
		'getZPersistentAlias',
		'getZMonolingualStringsetValues'
	] ), {
		/**
		 * Returns the Alias (Z2K4) row for the selected language.
		 *
		 * @return {Object|undefined}
		 */
		aliasRow: function () {
			return this.zLanguage ?
				this.getZPersistentAlias( this.zLanguage ) :
				undefined;
		},
		/**
		 * Returns the array of string aliases for the selected language
		 *
		 * @return {Array}
		 */
		aliases: function () {
			return ( this.aliasRow ? this.getZMonolingualStringsetValues( this.aliasRow.id ) : [] )
				.map( ( value ) => ( {
					id: value.rowId,
					value: value.value
				} ) );
		},
		/**
		 * Returns whether there are any aliases for the selected language
		 *
		 * @return {boolean}
		 */
		hasAliases: function () {
			return this.aliases.length > 0;
		},
		/**
		 * Returns the label for the alias field
		 *
		 * @return {string}
		 */
		aliasLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_PERSISTENTOBJECT_ALIASES );
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
			return !this.hasAliases ?
				this.$i18n( 'wikilambda-function-definition-alias-placeholder' ).text() :
				'';
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
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Persists the aliases in the data store.
		 *
		 * @param {Array} aliases list of aliases to persist
		 * @return {void}
		 */
		persistAliases: function ( aliases ) {
			const rowId = this.aliasRow ? this.aliasRow.id : undefined;
			this.persistZMonolingualStringSet(
				rowId,
				aliases.map( ( alias ) => alias.value )
			);
		},
		/**
		 * Persists ZMonolingualStringset changes in the data store.
		 * These correspond to the Aliases/Z2K4 field.
		 * TODO: When About Widget 2.0 is finished, move this (and persistZMonolingualString)
		 * into a mixin or into the zobject store actions.
		 *
		 * @param {number|undefined} currentRowId current monolingual stringset row Id
		 * @param {Array} values list of aliases to persist
		 */
		persistZMonolingualStringSet: function ( currentRowId, values ) {
			if ( currentRowId ) {
				if ( values.length === 0 ) {
					this.removeItemFromTypedList( { rowId: currentRowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentRowId,
						keyPath: [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ],
						value: [ Constants.Z_STRING, ...values ]
					} );
				}
			} else {
				// If currentRowId is undefined, there's no monolingual stringset
				// for the given language, so we create a new monolingual stringset
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] );
				if ( !parentRow ) {
					// This should never happen because all Z2Kn's are initialized
					return;
				}
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRINGSET,
					lang: this.zLanguage,
					value: values,
					append: true
				} );
			}

			this.$emit( 'alias-updated' );
		}
	} )
} );
</script>
