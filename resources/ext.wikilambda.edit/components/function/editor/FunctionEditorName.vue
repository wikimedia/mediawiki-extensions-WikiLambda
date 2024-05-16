<!--
	WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-name">
		<div class="ext-wikilambda-function-block__label">
			<label :for="nameFieldId">
				{{ nameLabel }}
				<span>{{ nameOptional }}</span>
			</label>
		</div>
		<div class="ext-wikilambda-function-block__body">
			<cdx-text-input
				:id="nameFieldId"
				:model-value="name"
				class="ext-wikilambda-function-definition-name__input"
				:aria-label="nameLabel"
				:placeholder="nameFieldPlaceholder"
				:max-chars="maxLabelChars"
				@change="persistName"
			></cdx-text-input>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput;

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-name',
	components: {
		'cdx-text-input': CdxTextInput
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
		},
		isMainLanguageBlock: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			maxLabelChars: Constants.LABEL_CHARS_MAX
		};
	},
	computed: Object.assign( mapGetters( [
		'getZPersistentName',
		'getZMonolingualTextValue',
		'getRowByKeyPath'
	] ), {
		/**
		 * Returns the Name (Z2K3) row for the given language.
		 * If the language is not set, returns undefined
		 *
		 * @return {Object|undefined}
		 */
		nameObject: function () {
			return this.zLanguage ? this.getZPersistentName( this.zLanguage ) : undefined;
		},
		/**
		 * Returns whether this function has a name object
		 * for the given language.
		 *
		 * @return {boolean}
		 */
		hasName: function () {
			return !!this.nameObject;
		},
		/**
		 * Returns the Name value for the given language.
		 * If value is not available, returns empty string
		 *
		 * @return {string}
		 */
		name: function () {
			return this.hasName ?
				this.getZMonolingualTextValue( this.nameObject.rowId ) :
				'';
		},
		/**
		 * Returns the label for the name field
		 *
		 * @return {string}
		 */
		nameLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_PERSISTENTOBJECT_LABEL );
			return this.$i18n( 'wikilambda-function-definition-name-label' ).text();
		},
		/**
		 * Returns the i18n message for the name field placeholder
		 *
		 * @return {string}
		 */
		nameFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-name-placeholder' ).text();
		},
		/**
		 * Returns the "optional" caption for the name field
		 *
		 * @return {string}
		 */
		nameOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		nameFieldId: function () {
			return `ext-wikilambda-function-definition-name__input${ this.zLanguage }`;
		}
	} ),
	methods: Object.assign( mapActions( [
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Persist the new name value in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistName: function ( event ) {
			const value = event.target.value;
			if ( this.hasName ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: this.nameObject.rowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: this.nameObject.rowId,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If this.nameObject is undefined, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] );
				if ( !parentRow ) {
					// This should never happen because all Z2Kn's are initialized
					return;
				}
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: this.zLanguage,
					value,
					append: true
				} );
			}
			if ( this.isMainLanguageBlock ) {
				this.setPageTitle( value );
			}
			this.$emit( 'updated-name' );
		},

		/**
		 * If this is the main language represented in the page,
		 * sets the page title to the new Function Name
		 *
		 * @param {string} name
		 */
		setPageTitle: function ( name ) {
			const pageTitleSelector = '#firstHeading .ext-wikilambda-editpage-header-title--function-name';
			$( pageTitleSelector ).first().text( name );
		}
	} )
} );
</script>
