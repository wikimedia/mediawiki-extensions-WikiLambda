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
			:title="$i18n( 'wikilambda-about-widget-edit-metadata-accessible-title' ).text()"
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
						:aria-label="$i18n( 'wikilambda-dialog-close' ).text()"
						@click="closeDialog"
					>
						<cdx-icon :icon="iconClose"></cdx-icon>
					</cdx-button>
				</div>
				<!-- Language Selector block -->
				<div class="ext-wikilambda-about-edit-metadata-language">
					<div class="ext-wikilambda-about-edit-metadata-title">
						<span
							:lang="languageLabelData.langCode"
							:dir="languageLabelData.langDir"
						>{{ languageLabelData.label }}</span>
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
				<cdx-field
					class="ext-wikilambda-about-edit-metadata-name
					ext-wikilambda-about-edit-metadata-field"
					:optional-flag="optionalText"
				>
					<cdx-text-input
						v-model="name"
						:disabled="!canEdit"
						:placeholder="namePlaceholder"
						data-testid="text-input"
					></cdx-text-input>
					<template #label>
						<span
							:lang="nameLabelData.langCode"
							:dir="nameLabelData.langDir"
						>{{ nameLabelData.label }}</span>
					</template>
					<template #help-text>
						{{ labelCharsLeft }}
					</template>
				</cdx-field>
				<!-- Description field -->
				<cdx-field
					:optional-flag="optionalText"
					class="ext-wikilambda-about-edit-metadata-field
					ext-wikilambda-about-edit-metadata-description"
				>
					<cdx-text-area
						v-model="description"
						:disabled="!canEdit"
						:placeholder="descriptionPlaceholder"
						data-testid="text-area"
					></cdx-text-area>
					<template #label>
						<span
							:lang="descriptionLabelData.langCode"
							:dir="descriptionLabelData.langDir"
						>{{ descriptionLabelData.label }}</span>
					</template>
					<template #help-text>
						{{ descriptionCharsLeft }}
					</template>
				</cdx-field>
				<!-- Aliases field -->
				<div class="ext-wikilambda-about-edit-metadata-alias">
					<div class="ext-wikilambda-about-edit-metadata-title">
						<span
							:lang="aliasesLabelData.langCode"
							:dir="aliasesLabelData.langDir"
						>{{ aliasesLabelData.label }}</span>
						<span class="ext-wikilambda-about-edit-metadata-optional">
							{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}
						</span>
					</div>
					<div class="ext-wikilambda-about-edit-metadata-field">
						<wl-chip-container
							:chips="aliases"
							:disabled="!canEdit"
							:input-placeholder="aliasesPlaceholder"
							@add-chip="addAlias"
							@remove-chip="removeAlias"
						></wl-chip-container>
						<span class="ext-wikilambda-about-edit-metadata-field-caption">
							{{ $i18n( 'wikilambda-about-widget-aliases-caption' ).text() }}
						</span>
					</div>
				</div>
				<!-- Function input fields -->
				<template v-if="isFunction">
					<cdx-field
						v-for="( input, index ) in inputs"
						:key="'input-' + index"
						:optional-flag="optionalText"
						class="ext-wikilambda-about-edit-metadata-field
						ext-wikilambda-about-edit-metadata-input"
					>
						<cdx-text-input
							v-model="inputs[ index ]"
							:disabled="!canEdit"
							:placeholder="inputPlaceholder"
							data-testid="text-input"
						></cdx-text-input>
						<template #label>
							{{ $i18n( 'wikilambda-about-widget-input-label', index + 1 ).text() }}
						</template>
					</cdx-field>
				</template>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	ChipContainer = require( '../base/ChipContainer.vue' ),
	ZObjectSelector = require( '../base/ZObjectSelector.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxField = require( '@wikimedia/codex' ).CdxField,
	CdxTextArea = require( '@wikimedia/codex' ).CdxTextArea,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	icons = require( '../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-about-edit-metadata-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-icon': CdxIcon,
		'cdx-text-area': CdxTextArea,
		'cdx-text-input': CdxTextInput,
		'cdx-field': CdxField,
		'wl-chip-container': ChipContainer,
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		canEdit: {
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
		},
		isFunction: {
			type: Boolean,
			required: true
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
			inputs: [],
			fakeAliasId: 0,
			initialName: '',
			initialDescription: '',
			initialAliases: '[]',
			initialInputs: '[]',
			pageTitleObject: null
		};
	},
	computed: Object.assign( mapGetters( [
		'getLabelData',
		'getMetadataLanguages',
		'getRowByKeyPath',
		'getFallbackLanguageZids',
		'getZArgumentLabelForLanguage',
		'getZFunctionInputs',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentAlias',
		'getZPersistentDescription',
		'getZPersistentName',
		'getUserLangZid'
	] ), {
		/**
		 * Returns the Name/Label (Z2K3) row for the selected language.
		 *
		 * @return {Object|undefined}
		 */
		currentNameObject: function () {
			return this.forLanguage ? this.getZPersistentName( this.forLanguage ) : undefined;
		},
		/**
		 * Returns the Description (Z2K5) row for the selected language.
		 *
		 * @return {Object|undefined}
		 */
		currentDescriptionObject: function () {
			return this.forLanguage ? this.getZPersistentDescription( this.forLanguage ) : undefined;
		},
		/**
		 * Returns the Alias (Z2K4) row for the selected language.
		 *
		 * @return {Object|undefined}
		 */
		currentAliasObject: function () {
			return this.forLanguage ? this.getZPersistentAlias( this.forLanguage ) : undefined;
		},
		/**
		 * Returns the parent rows for all the function inputs or empty
		 * array if there are none (or the object is not a function)
		 *
		 * @return {Array}
		 */
		functionInputs: function () {
			return this.getZFunctionInputs();
		},
		/**
		 * Returns the input label object in the selected language
		 * for all the function inputs or empty array if there are none
		 * (or the object is not a function)
		 *
		 * @return {Array}
		 */
		currentInputObjects: function () {
			return this.isFunction ?
				this.functionInputs.map( ( row ) => this.forLanguage ?
					this.getZArgumentLabelForLanguage( row.id, this.forLanguage ) :
					undefined ) :
				[];
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
		 * Returns the i18n message for an input field placeholder
		 *
		 * @return {string}
		 */
		inputPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text();
		},
		/**
		 * Returns the i18n message for wikilambda-optional text
		 *
		 * @return {string}
		 */
		optionalText: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the label for the selected language
		 *
		 * @return {LabelData}
		 */
		languageLabelData: function () {
			return this.getLabelData( Constants.Z_MONOLINGUALSTRING_LANGUAGE );
		},
		/**
		 * Returns the label for the name input field (Z2K3)
		 *
		 * @return {LabelData}
		 */
		nameLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_LABEL );
		},
		/**
		 * Returns the label for the description input field (Z2K5)
		 *
		 * @return {LabelData}
		 */
		descriptionLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
		},
		/**
		 * Returns the label for the aliases input field (Z2K4)
		 *
		 * @return {LabelData}
		 */
		aliasesLabelData: function () {
			return this.getLabelData( Constants.Z_PERSISTENTOBJECT_ALIASES );
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
				( JSON.stringify( this.aliases ) !== this.initialAliases ) ||
				( JSON.stringify( this.inputs ) !== this.initialInputs )
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
				disabled: !this.hasChanges || !this.canEdit || !this.forLanguage
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
	methods: Object.assign( mapActions( [
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath',
		'setDirty'
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
			if ( !this.forLanguage ) {
				return;
			}

			this.persistState();
			this.setDirty( true );
			if ( !this.edit ) {
				this.$emit( 'publish' );
			} else {
				this.setPageTitle();
			}
			this.closeDialog();
		},

		/**
		 * Update the DOM elements of page title and language chip based on the provided data
		 * - page title: update the page title with the provided title
		 * - language chip: update the language chip with the provided language code
		 */
		updatePageTitleElements: function () {
			// eslint-disable-next-line no-jquery/no-global-selector
			const $firstHeading = $( '#firstHeading' );
			const $langChip = $firstHeading.find( '.ext-wikilambda-editpage-header--bcp47-code-name' );
			const $pageTitle = $firstHeading.find( '.ext-wikilambda-editpage-header-title--function-name' ).first();

			// Update the title
			$pageTitle
				.toggleClass( 'ext-wikilambda-editpage-header--title-untitled', !this.pageTitleObject.title )
				.text( this.pageTitleObject.title || this.$i18n( 'wikilambda-editor-default-name' ).text() );

			// Update the language chip
			$langChip
				.toggleClass( 'ext-wikilambda-editpage-header--bcp47-code-hidden', !this.pageTitleObject.hasChip )
				.text( this.pageTitleObject.chip )
				.attr( 'data-title', this.pageTitleObject.chipName );
		},

		/**
		 * Set the page title object based on the provided name object and chip flag
		 *
		 * @param {Object} nameObject - object with the name row id and language code
		 * @param {boolean} hasChip - flag to indicate if the language chip should be displayed
		 */
		setPageTitleObject: function ( nameObject, hasChip ) {
			if ( nameObject ) {
				this.pageTitleObject.title = this.getZMonolingualTextValue( nameObject.rowId );
				this.pageTitleObject.hasChip = hasChip;
				this.pageTitleObject.chip = nameObject.langIsoCode;
				this.pageTitleObject.chipName = this.getLabelData( nameObject.langZid ).label;
			} else {
				this.pageTitleObject.title = null;
				this.pageTitleObject.hasChip = false;
				this.pageTitleObject.chip = null;
				this.pageTitleObject.chipName = null;
			}
		},

		/**
		 * Update the page title object based on the provided name;
		 * - Is there a title in my language?
		 *   - Yes: { title: "Title", hasChip: false }
		 *   - No: for each lang in fallback languages [ "A", "B", "C" ], check:
		 *     - Is there a title in a fallback language?
		 *       - Yes: { title: "Title", hasChip: true }
		 *       - No: { title: null, hasChip: false }
		 * Finally update the title DOM elements to reflect the new state.
		 */
		updatePageTitleObject: function () {
			const nameObject = this.getZPersistentName( this.getUserLangZid );

			this.pageTitleObject = this.pageTitleObject || {};

			// Is there a title in my language?
			if ( nameObject ) {
				// Yes
				this.setPageTitleObject( nameObject, false );
			} else {
				// No
				const fallbackLanguages = this.getFallbackLanguageZids
					.slice( this.getFallbackLanguageZids.indexOf( this.getUserLangZid ) + 1 );

				// Is there a title in a fallback language?
				const hasTitle = fallbackLanguages.some( ( lang ) => {
					const fallbackNameObject = this.getZPersistentName( lang );

					// Yes, title in a fallback language
					if ( fallbackNameObject ) {
						this.setPageTitleObject( fallbackNameObject, true );
						return true;
					}
					// No, no title available in a fallback language
					return false;
				} );

				// No title available in any language
				if ( !hasTitle ) {
					this.setPageTitleObject( null, false );
				}
			}
		},

		/**
		 * Update the page title and language chip based on the provided data.
		 * - First construct a new page title object based on the provided name.
		 * - Then update the DOM elements of page title and language chip based on the new object.
		 */
		setPageTitle: function () {
			this.updatePageTitleObject();
			this.updatePageTitleElements();
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

			// If function, initialize Input fields for given language
			if ( this.isFunction ) {
				this.inputs = this.currentInputObjects.map( ( row ) => row !== undefined ?
					this.getZMonolingualTextValue( row.id ) :
					'' );
			}

			this.saveCopies();
		},

		/**
		 * Persists the new changes in the data store.
		 */
		persistState: function () {
			let currentRowId, parentRowId;

			// If name has changed, persist
			if ( this.name !== this.initialName ) {
				currentRowId = this.currentNameObject ? this.currentNameObject.rowId : null;
				parentRowId = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id;
				this.persistZMonolingualString( parentRowId, currentRowId, this.name );
			}

			// If description has changed, persist
			if ( this.description !== this.initialDescription ) {
				currentRowId = this.currentDescriptionObject ? this.currentDescriptionObject.rowId : null;
				parentRowId = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id;
				this.persistZMonolingualString( parentRowId, currentRowId, this.description );
			}

			// If aliases have changed, persist
			if ( JSON.stringify( this.aliases ) !== this.initialAliases ) {
				this.persistZMonolingualStringSet(
					this.currentAliasObject,
					this.aliases.map( ( a ) => a.value )
				);
			}

			// If inputs have changed, persist
			if ( JSON.stringify( this.inputs ) !== this.initialInputs ) {
				const initial = JSON.parse( this.initialInputs );
				for ( const index in this.inputs ) {
					if ( this.inputs[ index ] !== initial[ index ] ) {
						const inputRowId = this.functionInputs[ index ].id;
						parentRowId = this.getRowByKeyPath( [
							Constants.Z_ARGUMENT_LABEL,
							Constants.Z_MULTILINGUALSTRING_VALUE
						], inputRowId ).id;
						currentRowId = this.currentInputObjects[ index ] ?
							this.currentInputObjects[ index ].id :
							null;
						this.persistZMonolingualString( parentRowId, currentRowId, this.inputs[ index ] );
					}
				}
			}
		},
		/**
		 * Persists the ZMonolingualString type changes in the data store.
		 * These correspond to the Name/Z2K3 and Description/Z2K5 fields.
		 *
		 * @param {number} parentRowId identifies the parent multilingual value row Id
		 * @param {number|null} currentRowId identifies the current monolingual value row Id
		 * @param {string} value
		 */
		persistZMonolingualString: function ( parentRowId, currentRowId, value ) {
			if ( currentRowId !== null ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: currentRowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentRowId,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If currentRowId is null, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				this.changeType( {
					id: parentRowId,
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
		},
		/**
		 * Saves copies of initial values for name, description, aliases and inputs
		 */
		saveCopies: function () {
			this.initialName = this.name;
			this.initialDescription = this.description;
			this.initialAliases = JSON.stringify( this.aliases );
			this.initialInputs = JSON.stringify( this.inputs );
		},
		/**
		 * Saves copies of initial values for name, description, aliases and inputs
		 */
		initializeBlankValues: function () {
			this.name = '';
			this.description = '';
			this.aliases = [];
			this.inputs = this.isFunction ? this.currentInputObjects.map( () => '' ) : [];
			this.saveCopies();
		}
	} ),
	watch: {
		forLanguage: function ( newLang, oldLang ) {
			// Skip initialization if:
			// * oldLang is empty and newLang is set
			// * newLang doesn't have any labels yet
			// * form has changes
			const hasLabels = this.getMetadataLanguages().includes( newLang );
			if ( !oldLang && !!newLang && !hasLabels && this.hasChanges ) {
				return;
			}
			this.initialize();
		}
	},
	mounted: function () {
		this.initializeBlankValues();
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-about-edit-metadata {
	.cdx-dialog__body {
		padding: @spacing-50 0;
	}

	.ext-wikilambda-about-edit-metadata-title {
		font-weight: @font-weight-bold;
		margin: 0 0 @spacing-25;

		.ext-wikilambda-about-edit-metadata-optional {
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

			.cdx-field__help-text {
				float: right;
			}

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
