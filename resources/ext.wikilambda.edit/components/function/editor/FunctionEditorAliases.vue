<!--
	WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-aliases">
		<div class="ext-wikilambda-function-block__label">
			<label :for="aliasFieldId">
				{{ aliasLabel }}
				<span>{{ aliasOptional }}</span>
			</label>
			<span class="ext-wikilambda-function-block__label__description">
				{{ aliasFieldDescription }}
			</span>
		</div>
		<div class="ext-wikilambda-function-block__body">
			<wl-chip-container
				:id="aliasFieldId"
				:chips="aliases"
				:input-placeholder="aliasFieldPlaceholder"
				:input-aria-label="aliasInputLabel"
				@add-chip="addAlias"
				@remove-chip="removeAlias"
			></wl-chip-container>
			<p
				v-if="repeatedAlias"
				class="ext-wikilambda-function-definition-aliases__error"
			>
				{{ aliasErrorMessage }}
			</p>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	WlChipContainer = require( '../../base/ChipContainer.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-aliases',
	components: {
		// TODO: replace with codex filter chip when available
		'wl-chip-container': WlChipContainer
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
	data: function () {
		return {
			repeatedAlias: null
		};
	},
	computed: $.extend( mapGetters( [
		'getRowByKeyPath',
		'getZPersistentAlias',
		'getZMonolingualStringsetValues'
	] ), {
		/**
		 * Returns the Alias (Z2K4) row for the selected language.
		 *
		 * @return {Object|undefined}
		 */
		aliasObject: function () {
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
			return !this.aliasObject ? [] : this.getZMonolingualStringsetValues( this.aliasObject.rowId )
				.map( ( value ) => {
					return {
						id: value.rowId,
						value: value.value
					};
				} );
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
			// return this.getLabel( Constants.Z_PERSISTENTOBJECT_ALIASES );
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
			return !this.hasAlias ?
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
		 * Returns the error message for when an alias is repeated
		 *
		 * @return {string}
		 */
		aliasErrorMessage: function () {
			return this.$i18n( 'wikilambda-metadata-duplicate-alias-error', this.repeatedAlias ).text();
		},
		/**
		 * Returns the id for the alias field
		 *
		 * @return {string}
		 */
		aliasFieldId: function () {
			return `ext-wikilambda-function-definition-aliases__input${ this.zLanguage }`;
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'removeItemFromTypedList'
	] ), {
		/**
		 * Add a new string to the alias stringset
		 *
		 * @param {string} alias
		 */
		addAlias: function ( alias ) {
			// show an error message if a user enters a duplicate alias
			// TODO (T317990): should duplication be case sensitive?
			if ( this.aliases.some( ( a ) => a.value === alias ) ) {
				this.repeatedAlias = alias;
				return;
			}
			// clear the error message
			this.clearAliasError();

			if ( this.aliasObject ) {
				// If monolingual string set for the given language exists,
				// find the monolingual string set value and add new string to the list.
				const stringSet = this.getRowByKeyPath( [
					Constants.Z_MONOLINGUALSTRINGSET_VALUE
				], this.aliasObject.rowId );
				this.changeType( {
					type: Constants.Z_STRING,
					id: stringSet.id,
					value: alias,
					append: true
				} );
			} else {
				// If the monolingualStringSet for the given language does not exist,
				// create a monolingualStringSet object with an empty array of strings
				// and add it to the list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] );
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRINGSET,
					lang: this.zLanguage,
					value: [ alias ],
					append: true
				} );
			}
			this.$emit( 'updated-alias' );
		},
		/**
		 * Remove an alias from the monolingual stringset
		 * value list given the alias row Id.
		 *
		 * @param {string} rowId
		 */
		removeAlias: function ( rowId ) {
			this.clearAliasError();
			this.removeItemFromTypedList( { rowId } );
			this.$emit( 'updated-alias' );
		},
		/**
		 * Clear the local error for repeated alias
		 */
		clearAliasError: function () {
			this.repeatedAlias = null;
		}
	} )
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-definition-aliases {
	&__error {
		color: @color-error;
	}
}
</style>
