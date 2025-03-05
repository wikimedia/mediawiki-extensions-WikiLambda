<!--
	WikiLambda Vue component - About Widget.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-about" data-testid="about-widget">
		<!-- Widget header -->
		<template #header>
			{{ $i18n( 'wikilambda-about-widget-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="isEditing && !edit"
				class="ext-wikilambda-app-about__button-cancel"
				action="default"
				@click="resetEditState"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="isEditing & !edit"
				class="ext-wikilambda-app-about__button-publish"
				action="progressive"
				@click="saveAllChanges"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<!-- Language accordion -->
			<cdx-accordion
				v-for="( displayLanguage, index ) in displayLanguages"
				:key="displayLanguage.zid"
				:ref="`block-${ index }`"
				:action-icon="( canEditObject && !displayLanguage.edit ) ? iconEdit : null"
				:open="displayLanguage.open"
				class="ext-wikilambda-app-about__accordion"
				action-always-visible
				data-testid="about-language-accordion"
				:action-button-label="$i18n( 'wikilambda-about-widget-edit-button' ).text()"
				@action-button-click="initializeEdit( index )"
				@toggle="displayLanguage.open = $event"
			>
				<template #title>
					{{ displayData[ index ].title }}
				</template>
				<template #description>
					<span :class="accordionDescriptionClass( displayData[ index ].hasName )">
						{{ displayData[ index ].name }}
					</span>
				</template>
				<wl-about-language-block
					:edit="displayLanguage.edit"
					:language="displayLanguage.zid"
					:is-function="isFunction"
					:view-data="displayData[ index ].viewData"
					:edit-data="displayLanguage.editData"
					:field-langs="fieldLangs"
					@update-edit-value="updateEditValue"
					@change-value="saveFieldChange"
				></wl-about-language-block>
			</cdx-accordion>

			<!-- Dialogs -->
			<wl-about-languages-dialog
				:open="showLanguagesDialog"
				@add-language="addLanguage"
				@close-dialog="showLanguagesDialog = false"
			></wl-about-languages-dialog>
			<wl-publish-dialog
				v-if="!edit"
				:show-dialog="showPublishDialog"
				@close-dialog="cancelPublish"
			></wl-publish-dialog>
		</template>

		<!-- Widget footer -->
		<template #footer>
			<div class="ext-wikilambda-app-about__button-languages">
				<cdx-button data-testid="languages-button" @click="openLanguagesDialog">
					<cdx-icon :icon="iconLanguage"></cdx-icon>
					{{ $i18n( 'wikilambda-about-widget-language-count-button', languageCount ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const icons = require( '../../../../lib/icons.json' );
const Constants = require( '../../../Constants.js' );
const pageTitleMixin = require( '../../../mixins/pageTitleMixin.js' );
const useMainStore = require( '../../../store/index.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Widget components
const AboutLanguageBlock = require( './AboutLanguageBlock.vue' );
const AboutLanguagesDialog = require( './AboutLanguagesDialog.vue' );
const PublishDialog = require( '../publish/PublishDialog.vue' );
// Codex components
const { CdxAccordion, CdxButton, CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-about-widget',
	components: {
		'cdx-accordion': CdxAccordion,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-about-language-block': AboutLanguageBlock,
		'wl-about-languages-dialog': AboutLanguagesDialog,
		'wl-publish-dialog': PublishDialog,
		'wl-widget-base': WidgetBase
	},
	mixins: [ pageTitleMixin ],
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		type: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			iconEdit: icons.cdxIconEdit,
			iconLanguage: icons.cdxIconLanguage,
			displayLanguages: [],
			showLanguagesDialog: false,
			showPublishDialog: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getFallbackLanguageZids',
		'getLabelData',
		'getMultilingualDataLanguages',
		'getUserLangZid',
		'getZFunctionInputLabels',
		'getZPersistentName',
		'getZPersistentDescription',
		'getZPersistentAlias',
		'isCreateNewPage',
		'isDirty',
		'isUserLoggedIn'
	] ), {
		/**
		 * Returns a computed array of the multilingual data for
		 * the languages selected for display, as per their persisted
		 * state in the global store.
		 *
		 * @return {Array}
		 */
		displayData: function () {
			return this.displayLanguages.map( ( lang ) => this.getMultilingualDataForLanguage( lang.zid ) );
		},
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		canEditObject: function () {
			// TODO (T301667): restrict to only certain user roles
			return this.isCreateNewPage ? true : this.isUserLoggedIn;
		},
		/**
		 * Returns whether any of the language blocks is being edited
		 *
		 * @return {boolean}
		 */
		isEditing: function () {
			return !!this.displayLanguages.find( ( item ) => item.edit );
		},
		/**
		 * Returns the available languages for each field
		 *
		 * @return {Object}
		 */
		fieldLangs: function () {
			const { name, description, aliases, inputs } = this.getMultilingualDataLanguages;
			return { name, description, aliases, inputs };
		},
		/**
		 * Returns a list of all the language Zids that are present in
		 * the multilingual data collection (must have at least a name,
		 * a description, a set of aliases or an input label in case the
		 * object is a function).
		 *
		 * @return {Array}
		 */
		allLangs: function () {
			return this.getMultilingualDataLanguages.all;
		},
		/**
		 * Returns the count of the list of unique available languages
		 *
		 * @return {number}
		 */
		languageCount: function () {
			return this.allLangs.length;
		},
		/**
		 * Returns whether the current object is a function
		 *
		 * @return {boolean}
		 */
		isFunction: function () {
			return this.type === Constants.Z_FUNCTION;
		},
		/**
		 * Returns the list of fallback languages in their Zid
		 * representation, excluding the first (user selected language)
		 *
		 * @return {Array}
		 */
		fallbackLanguageZids: function () {
			return this.getFallbackLanguageZids.slice( 1 );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setZMonolingualString',
		'setZMonolingualStringset',
		'resetMultilingualData',
		'setDirty'
	] ), {
		/**
		 * Opens the AboutLanguagesDialog
		 */
		openLanguagesDialog: function () {
			this.showLanguagesDialog = true;
		},
		/**
		 * Adds the selected language to the collection
		 * of displayed languages.
		 *
		 * @param {string} newLang
		 */
		addLanguage: function ( newLang ) {
			// Ignore if already displayed
			const found = this.displayLanguages.find( ( lang ) => lang.zid === newLang );
			if ( found ) {
				return;
			}
			this.displayLanguages.push( {
				zid: newLang,
				edit: this.edit,
				open: false,
				editData: this.edit ?
					this.editCopy( this.getMultilingualDataForLanguage( newLang ).viewData ) :
					undefined
			} );
		},
		/**
		 * Initialize the local editable data collection for a given
		 * language block given its index.
		 *
		 * @param {number} index
		 */
		initializeEdit: function ( index ) {
			this.displayLanguages[ index ].edit = true;
			this.displayLanguages[ index ].open = true;
			this.displayLanguages[ index ].editData = this.editCopy( this.displayData[ index ].viewData );
			this.$emit( 'edit-multilingual-data' );
		},
		/**
		 * Restores original view state and cancels publish
		 * action. This only happens when we are in a view page
		 * and after editing information, we proceed to publish
		 * and then we cancel.
		 */
		cancelPublish: function () {
			if ( this.isDirty ) {
				this.resetMultilingualData();
			}
			this.showPublishDialog = false;
		},
		/**
		 * Initializes the collection of languages to display in
		 * the About widget, according to the following logic:
		 * * The user language will always be shown first, in an expanded state.
		 * * If the user language doesn't have complete multilingual data, one or
		 *   more fallback languges will be added to the display.
		 * Each item also includes their local state:
		 * * edit state flag
		 * * edit data values
		 */
		initializeDisplayLanguages: function () {
			// 1. Always start with user language
			this.displayLanguages = [ {
				zid: this.getUserLangZid,
				edit: this.edit,
				open: true,
				editData: this.edit ?
					this.editCopy( this.getMultilingualDataForLanguage( this.getUserLangZid ).viewData ) :
					undefined
			} ];

			// 2. If important info in main language is complete, exit
			let missingName = !this.fieldLangs.name.includes( this.getUserLangZid );
			let missingInputs = this.fieldLangs.inputs.filter( ( langs ) => !langs.includes( this.getUserLangZid ) );
			if ( !missingName && missingInputs.length === 0 ) {
				return;
			}

			// 3. Collect fallback languages to cover up for missing fields
			let addBlocks = [];
			for ( const langZid of this.fallbackLanguageZids ) {
				// 3.1. If everything is complete, exit loop
				if ( !missingName && missingInputs.length === 0 ) {
					break;
				}

				// 3.2. If we are still missing a fallback name, check if we have it in this language
				if ( missingName ) {
					if ( this.fieldLangs.name.includes( langZid ) ) {
						addBlocks.push( langZid );
						missingName = false;
					}
				}

				// 3.3. For each missing input labels, check if we have it in this language
				const availableInputs = missingInputs.filter( ( input ) => input.includes( langZid ) );
				if ( availableInputs.length > 0 ) {
					addBlocks.push( langZid );
					missingInputs = missingInputs.filter( ( input ) => !input.includes( langZid ) );
				}
			}

			// 4. Remove duplicates and add fallback languages to language blocks
			addBlocks = [ ...new Set( addBlocks ) ];
			addBlocks.forEach( ( langZid ) => {
				this.displayLanguages.push( {
					zid: langZid,
					edit: this.edit,
					open: false,
					editData: this.edit ?
						this.editCopy( this.getMultilingualDataForLanguage( langZid ).viewData ) :
						undefined
				} );
			} );
		},
		/**
		 * Returns a collection fo all multilingual data fields and
		 * their values for a given language
		 *
		 * @param {string} langZid
		 * @return {Object}
		 */
		getMultilingualDataForLanguage: function ( langZid ) {
			const name = this.getZPersistentName( langZid );
			const description = this.getZPersistentDescription( langZid );
			const aliases = this.getZPersistentAlias( langZid );
			const inputs = this.isFunction ? this.getZFunctionInputLabels( langZid ) : [];

			const data = {
				name: {
					keyPath: name ? name.keyPath : undefined,
					value: name ? name.value : ''
				},
				description: {
					keyPath: description ? description.keyPath : undefined,
					value: description ? description.value : ''
				},
				aliases: {
					keyPath: aliases ? aliases.keyPath : undefined,
					value: aliases ? aliases.value : []
				},
				inputs
			};

			return {
				title: this.getLabelData( langZid ).label,
				hasName: !!data.name.value,
				name: data.name.value || this.$i18n( 'wikilambda-editor-default-name' ).text(),
				viewData: data
			};
		},
		/**
		 * Discards all edits and sets all language blocks to view mode.
		 */
		resetEditState: function () {
			this.displayLanguages.forEach( ( lang ) => {
				lang.edit = false;
				lang.editData = undefined;
			} );
		},
		/**
		 * Only in view pages (functions and others):
		 * Persists all accummulated changes in the store and initiates publish process.
		 * Triggered when user clicks the "Publish" button from the About widget header.
		 */
		saveAllChanges: function () {
			if ( this.edit ) {
				return;
			}
			this.persistState();
			this.showPublishDialog = true;
		},
		/**
		 * Only in edit page (non functions):
		 * Persists a field change in the store and updates the page title if needed.
		 * Triggered every time that a field emits a "change" event. Field changes
		 * are persisted as they are entered, and published when the page Publish
		 * button is clicked.
		 */
		saveFieldChange: function () {
			if ( !this.edit ) {
				return;
			}
			this.persistState();
		},
		/**
		 * For each language being edited, persists all changes
		 * in the store.
		 */
		persistState: function () {
			this.displayLanguages.forEach( ( lang, index ) => {
				// If language block is in edit mode, persist
				// all changes that have a different edit and view value.
				if ( lang.edit ) {
					const viewData = this.displayData[ index ].viewData;
					const editData = lang.editData;

					// Persist name if it changed
					if ( viewData.name.value !== editData.name.value ) {
						this.persistName(
							viewData.name.keyPath,
							editData.name.value,
							lang.zid
						);
					}

					// Persist description if it changed
					if ( viewData.description.value !== editData.description.value ) {
						this.persistDescription(
							viewData.description.keyPath,
							editData.description.value,
							lang.zid
						);
					}

					// Persist aliases if they changed
					if (
						JSON.stringify( viewData.aliases.value ) !==
						JSON.stringify( editData.aliases.value )
					) {
						this.persistAlias(
							viewData.aliases.keyPath,
							editData.aliases.value,
							lang.zid
						);
					}

					// Persist input labels if they changed
					for ( const input in editData.inputs ) {
						if ( viewData.inputs[ input ].value !== editData.inputs[ input ].value ) {
							this.persistInputLabel(
								viewData.inputs[ input ].keyPath,
								Number( input ) + 1,
								editData.inputs[ input ].value,
								lang.zid
							);
						}
					}
				}
			} );
		},
		/**
		 * Persist in the global state a new value for name in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {string} value
		 * @param {string} lang
		 */
		persistName: function ( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			this.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			// After persisting in the state, update the page title
			this.updatePageTitle();
			this.setDirty( true );
		},
		/**
		 * Persist in the global state a new value for description in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {string} value
		 * @param {string} lang
		 */
		persistDescription: function ( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			this.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			this.setDirty( true );
		},
		/**
		 * Persist in the global state a new value for aliases in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {Array} value
		 * @param {string} lang
		 */
		persistAlias: function ( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			];
			this.setZMonolingualStringset( { parentKeyPath, itemKeyPath, value, lang } );
			this.setDirty( true );
		},
		/**
		 * Persist in the global state a new value for an input label in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {number} index
		 * @param {string} value
		 * @param {string} lang
		 */
		persistInputLabel: function ( itemKeyPath, index, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS,
				index,
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			this.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			this.setDirty( true );
		},
		/**
		 * Persists locally all the changes in the Language Block fields
		 *
		 * @param {Object} payload
		 * @param {Object} payload.data
		 * @param {Array|string} payload.value
		 */
		updateEditValue: function ( payload ) {
			payload.data.value = payload.value;
		},
		/**
		 * Returns special class for the accordion description
		 * depending on the availability of the title.
		 *
		 * @param {boolean} hasName
		 * @return {string}
		 */
		accordionDescriptionClass: function ( hasName ) {
			return hasName ? '' : 'ext-wikilambda-app-about__accordion--untitled';
		},
		/**
		 * Creates a value deep copy of the input string
		 * to be temporarily editable but not alter the store.
		 *
		 * @param {Object} viewObject
		 * @return {Object}
		 */
		editCopy( viewObject ) {
			return JSON.parse( JSON.stringify( viewObject ) );
		}
	} ),
	watch: {
		fallbackLanguageZids: function () {
			this.initializeDisplayLanguages();
		}
	},
	mounted: function () {
		this.initializeDisplayLanguages();
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-about {
	.ext-wikilambda-app-about__accordion--untitled {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-about__button-languages {
		margin-top: @spacing-125;
	}

	.ext-wikilambda-app-about__accordion .cdx-accordion__header {
		padding-right: @spacing-125;
	}
}
</style>
