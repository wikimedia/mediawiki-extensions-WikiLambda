<!--
	WikiLambda Vue component for the AboutEditMetadata Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<cdx-dialog
			:open="open"
			class="ext-wikilambda-about-edit-metadata"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			data-testid="edit-label-dialog"
			@default="closeDialog"
			@primary="saveChanges"
			@update:open="closeDialog"
		>
			<!-- Dialog Header -->
			<template #header>
				<div class="cdx-dialog__header--default">
					<div class="cdx-dialog__header__title-group">
						<h2 class="cdx-dialog__header__title">
							{{ $i18n( 'wikilambda-about-widget-edit-metadata-title' ).text() }}
						</h2>
					</div>
					<cdx-button
						weight="quiet"
						class="cdx-dialog__header__close-button"
						@click="closeDialog"
					>
						<cdx-icon :icon="iconClose"></cdx-icon>
					</cdx-button>
				</div>
				<!-- Language Selector block -->
				<div class="ext-wikilambda-about-edit-metadata-language">
					<div class="ext-wikilambda-about-edit-metadata-title">
						{{ languageLabel }}
					</div>
					<div class="ext-wikilambda-about-edit-metadata-field">
						<wl-z-object-selector
							:edit="true"
							:disabled="freezeLanguage"
							:selected-zid="forLanguage"
							:type="languageType"
							@input="selectLanguage"
						></wl-z-object-selector>
					</div>
				</div>
			</template>
			<!-- Dialog Body -->
			<div class="ext-wikilambda-about-edit-metadata-fields">
				<!-- Name field -->
				<div class="ext-wikilambda-about-edit-metadata-name">
					<div class="ext-wikilambda-about-edit-metadata-title">
						{{ nameLabel }}
						<span>{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
					</div>
					<div class="ext-wikilambda-about-edit-metadata-field">
						<wl-text-input
							v-model="name"
							:placeholder="namePlaceholder"
							:max-chars="maxLabelChars"
							data-testid="edit-label-input"
						></wl-text-input>
						<span class="ext-wikilambda-about-edit-metadata-char-counter">
							{{ labelCharsLeft }}
						</span>
					</div>
				</div>
				<!-- Description field -->
				<div class="ext-wikilambda-about-edit-metadata-description">
					<div class="ext-wikilambda-about-edit-metadata-title">
						{{ descriptionLabel }}
						<span>{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
					</div>
					<div class="ext-wikilambda-about-edit-metadata-field">
						<wl-text-input
							v-model="description"
							:model-value="description"
							:placeholder="descriptionPlaceholder"
							:max-chars="maxDescriptionChars"
						></wl-text-input>
						<span class="ext-wikilambda-about-edit-metadata-char-counter">
							{{ descriptionCharsLeft }}
						</span>
					</div>
				</div>
				<!-- Aliases field -->
				<div class="ext-wikilambda-about-edit-metadata-alias">
					<div class="ext-wikilambda-about-edit-metadata-title">
						{{ aliasesLabel }}
						<span>{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
					</div>
					<div class="ext-wikilambda-about-edit-metadata-field">
						<wl-chip-container
							:chips="aliases"
							:input-placeholder="aliasesPlaceholder"
							@add-chip="addAlias"
							@remove-chip="removeAlias"
						></wl-chip-container>
						<span class="ext-wikilambda-about-edit-metadata-field-caption">
							{{ $i18n( 'wikilambda-about-widget-aliases-caption' ).text() }}
						</span>
					</div>
				</div>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	ChipContainer = require( '../base/ChipContainer.vue' ),
	TextInput = require( '../base/TextInput.vue' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-about-edit-metadata-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-icon': CdxIcon,
		'wl-chip-container': ChipContainer,
		'wl-text-input': TextInput,
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		forLanguage: {
			type: String,
			required: true
		},
		open: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	data: function () {
		return {
			iconClose: icons.cdxIconClose,
			languageType: Constants.Z_NATURAL_LANGUAGE,
			maxLabelChars: Constants.LABEL_CHARS_MAX,
			maxDescriptionChars: Constants.DESCRIPTION_CHARS_MAX,
			name: '',
			description: '',
			aliases: [],
			fakeAliasId: 0,
			initialName: '',
			initialDescription: '',
			initialAliases: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getRowByKeyPath',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentAlias',
		'getZPersistentDescription',
		'getZPersistentName'
	] ), {
		/**
		 * Returns the Name/Label (Z2K3) row for the selected language.
		 *
		 * @return {Object}
		 */
		currentNameObject: function () {
			return this.getZPersistentName( this.forLanguage );
		},
		/**
		 * Returns the Description (Z2K5) row for the selected language.
		 *
		 * @return {Object}
		 */
		currentDescriptionObject: function () {
			return this.getZPersistentDescription( this.forLanguage );
		},
		/**
		 * Returns the Alias (Z2K4) row for the selected language.
		 *
		 * @return {Object}
		 */
		currentAliasObject: function () {
			return this.getZPersistentAlias( this.forLanguage );
		},

		/**
		 * Returns the i18n message for the name field placeholder
		 *
		 * @return {string}
		 */
		namePlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-name-placeholder' ).text();
		},
		/**
		 * Returns the i18n message for the description field placeholder
		 *
		 * @return {string}
		 */
		descriptionPlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-description-placeholder' ).text();
		},
		/**
		 * Returns the i18n message for the aliases field placeholder
		 *
		 * @return {string}
		 */
		aliasesPlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-aliases-placeholder' ).text();
		},

		/**
		 * Returns the label for the selected language
		 *
		 * @return {string}
		 */
		languageLabel: function () {
			return this.getLabel( Constants.Z_MONOLINGUALSTRING_LANGUAGE );
		},
		/**
		 * Returns the label for the selected language
		 *
		 * @return {string}
		 */
		selectedLanguageLabel: function () {
			return this.getLabel( this.forLanguage );
		},
		/**
		 * Returns the label for the name input field (Z2K3)
		 *
		 * @return {string}
		 */
		nameLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_LABEL );
		},
		/**
		 * Returns the label for the description input field (Z2K5)
		 *
		 * @return {string}
		 */
		descriptionLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
		},
		/**
		 * Returns the label for the aliases input field (Z2K4)
		 *
		 * @return {string}
		 */
		aliasesLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_ALIASES );
		},

		/**
		 * Returns whether any of the fields has suffered any
		 * change from its initial value
		 *
		 * @return {boolean}
		 */
		hasChanges: function () {
			return (
				( this.name !== this.initialName ) ||
				( this.description !== this.initialDescription ) ||
				( JSON.stringify( this.aliases ) !== this.initialAliases )
			);
		},

		/**
		 * Returns whether the language field should be disabled.
		 * This happens only when it has a selected language and the
		 * content of the fields has been edited. This is to prevent
		 * loss of unsaved edits.
		 *
		 * @return {boolean}
		 */
		freezeLanguage: function () {
			return ( this.hasChanges && !!this.forLanguage );
		},

		/**
		 * Returns an object of type PrimaryDialogAction that describes
		 * the action of the primary (save or publish) dialog button.
		 *
		 * @return {Object}
		 */
		primaryAction: function () {
			return {
				actionType: 'progressive',
				label: this.edit ?
					this.$i18n( 'wikilambda-about-widget-done-button' ).text() :
					this.$i18n( 'wikilambda-about-widget-publish-button' ).text(),
				disabled: !this.hasChanges
			};
		},

		/**
		 * Returns an object of type DialogAction that describes
		 * the action of the secondary (cancel) button.
		 *
		 * @return {Object}
		 */
		defaultAction: function () {
			return {
				label: this.$i18n( 'wikilambda-cancel' ).text()
			};
		},

		/**
		 * Returns the number of characters left to reach the
		 * label field maximum allowed.
		 *
		 * @return {number}
		 */
		labelCharsLeft: function () {
			return this.maxLabelChars - ( this.name && this.name.length || 0 );
		},

		/**
		 * Returns the number of characters left to reach the
		 * description field maximum allowed.
		 *
		 * @return {number}
		 */
		descriptionCharsLeft: function () {
			return this.maxDescriptionChars - this.description.length;
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Persist the changes in the store and finish the dialog
		 * flow, which differs between view and edit pages:
		 * * If we are on an edit page, we simply persist the changes
		 *   in the store and close the dialog.
		 * * If we are on a view page, we persist the changes in
		 *   the store and show the publish dialog to save the changes.
		 */
		saveChanges: function () {
			this.persistState();
			if ( !this.edit ) {
				this.$emit( 'publish' );
			}
			this.closeDialog();
		},

		/**
		 * Close the dialog and make sure that the selected language
		 * and unsaved changes are cleared.
		 */
		closeDialog: function () {
			// Emit unselected language to discard unsaved changes
			this.$emit( 'change-selected-language', '' );
			this.$emit( 'close' );
		},

		/**
		 * Adds a new alias to the temporary list of aliases.
		 *
		 * @param {string} alias
		 */
		addAlias: function ( alias ) {
			// The alias object needs its prop ID to be unique, that's why
			// we are assigning it a temporary fake id that cannot clash
			// with the existing alias IDs.
			// This is because the chip container and chip component are
			// too coupled with the backend store system and removing an
			// item expects to be sending up an event with the rowId.
			// TODO (T336347): We should probably decouple these components
			// from the internal data structure.
			this.aliases.push( {
				id: this.fakeAliasId,
				value: alias
			} );
			this.fakeAliasId++;
		},

		/**
		 * Remove an alias from the temporary list of aliases.
		 *
		 * @param {number} aliasId
		 */
		removeAlias: function ( aliasId ) {
			for ( const i in this.aliases ) {
				if ( this.aliases[ i ].id === aliasId ) {
					this.aliases.splice( i, 1 );
					return;
				}
			}
		},

		/**
		 * Throw the event changeSelectedLanguage when the language
		 * field has a new valid content. This will trigger the
		 * reloading of metadata for that language.
		 *
		 * @param {string} value
		 */
		selectLanguage: function ( value ) {
			if ( value ) {
				this.$emit( 'change-selected-language', value );
			}
		},

		/**
		 * Intializes the metadata fields name, description and aliases
		 * for a given language.
		 */
		initialize: function () {
			// Initialize Name field for given language
			this.name = this.currentNameObject ?
				this.getZMonolingualTextValue( this.currentNameObject.rowId ) :
				'';

			// Initialize Description field for given language
			this.description = this.currentDescriptionObject ?
				this.getZMonolingualTextValue( this.currentDescriptionObject.rowId ) :
				'';

			// Initialize Aliases field for given language
			this.fakeAliasId = 0;
			this.aliases = this.currentAliasObject ?
				this.getZMonolingualStringsetValues( this.currentAliasObject.rowId )
					.map( ( value ) => {
						// We add the alias rowIds to calculate a fakeAliasId
						// integer to start assigning new ids for aliases.
						// This is the easiert way to assure the ids don't
						// clash with existing alias ones. The assigned
						// IDs to new alias are temporary and will not be
						// persisted.
						// TODO (T336347): fakeAliasId will not be necessary
						// after Chip component is decouples from zobject data
						this.fakeAliasId += value.rowId;
						return {
							id: value.rowId,
							value: value.value
						};
					} ) :
				[];

			// Save copy of initial values
			this.initialName = this.name;
			this.initialDescription = this.description;
			this.initialAliases = JSON.stringify( this.aliases );
		},

		/**
		 * Persists the new changes in the data store.
		 */
		persistState: function () {
			// If name has changed, persist
			if ( this.name !== this.initialName ) {
				this.persistZMonolingualString(
					Constants.Z_PERSISTENTOBJECT_LABEL,
					this.currentNameObject,
					this.name
				);
			}

			// If description has changed, persist
			if ( this.description !== this.initialDescription ) {
				this.persistZMonolingualString(
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					this.currentDescriptionObject,
					this.description
				);
			}

			// If aliases have changed, persist
			if ( JSON.stringify( this.aliases ) !== this.initialAliases ) {
				this.persistZMonolingualStringSet(
					this.currentAliasObject,
					this.aliases.map( ( a ) => a.value )
				);
			}
		},

		/**
		 * Persists the ZMonolingualString type changes in the data store.
		 * These correspond to the Name/Z2K3 and Description/Z2K5 fields.
		 *
		 * @param {string} persistentObjectKey identifies name or description (Z2K3 or Z2K5)
		 * @param {Object} currentObject object with the row id to persist the changes
		 * @param {string} value
		 */
		persistZMonolingualString: function ( persistentObjectKey, currentObject, value ) {
			if ( currentObject ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: currentObject.rowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentObject.rowId,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If currentObject is undefined, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					persistentObjectKey,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] );
				if ( !parentRow ) {
					// This should never happen because all Z2Kn's are initialized
					return;
				}
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: this.forLanguage,
					value,
					append: true
				} );
			}
		},

		/**
		 * Persists the ZMonolingualStringset type changes in the data store.
		 * These correspond to the Aliases/Z2K4 field.
		 *
		 * @param {Object} currentObject object with the row id to persist the changes
		 * @param {string} values list of alias to persist
		 */
		persistZMonolingualStringSet: function ( currentObject, values ) {
			if ( currentObject ) {
				if ( values.length === 0 ) {
					this.removeItemFromTypedList( { rowId: currentObject.rowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentObject.rowId,
						keyPath: [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ],
						value: [ Constants.Z_STRING, ...values ]
					} );
				}
			} else {
				// If currentObject is undefined, there's no monolingual stringset
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
					lang: this.forLanguage,
					value: values,
					append: true
				} );
			}
		}
	} ),
	watch: {
		forLanguage: function () {
			this.initialize();
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-about-edit-metadata {
	gap: @spacing-100;

	.cdx-dialog__body {
		padding: @spacing-50 0;
		border-bottom: 1px solid @border-color-subtle;
		border-top: 1px solid @border-color-subtle;
	}

	.ext-wikilambda-about-edit-metadata-title {
		font-weight: @font-weight-bold;
		text-transform: capitalize;
		margin: 0 0 @spacing-25;

		span {
			text-transform: none;
			font-weight: @font-weight-normal;
			color: @color-subtle;
			margin-left: @spacing-25;
		}
	}

	.ext-wikilambda-about-edit-metadata-char-counter {
		text-align: right;
	}

	.ext-wikilambda-about-edit-metadata-fields {
		padding: 0 @spacing-150;

		.ext-wikilambda-about-edit-metadata-field {
			margin: 0 0 @spacing-100;

			.cdx-text-input {
				flex: 1;
			}

			.ext-wikilambda-about-edit-metadata-field-caption {
				display: block;
				color: @color-subtle;
				margin-top: @spacing-25;
			}
		}
	}

	.ext-wikilambda-about-edit-metadata-language {
		.ext-wikilambda-about-edit-metadata-title {
			margin-top: @spacing-100;
		}
	}
}
</style>
