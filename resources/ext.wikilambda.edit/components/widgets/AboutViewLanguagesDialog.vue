<template>
	<!--
		WikiLambda Vue component for the AboutViewLanguages Dialog.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<cdx-dialog
			:open="open"
			class="ext-wikilambda-about-language-list"
			:default-action="defaultAction"
			@default="addLanguage"
			@update:open="closeDialog"
		>
			<!-- Dialog Header -->
			<template #header>
				<div class="cdx-dialog__header--default">
					<div class="cdx-dialog__header__title-group">
						<h2 class="cdx-dialog__header__title">
							{{ $i18n( 'wikilambda-about-widget-view-languages-title' ).text() }}
						</h2>
					</div>
					<cdx-button
						weight="quiet"
						class="cdx-dialog__header__close-button"
						@click="closeDialog"
					>
						<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
					</cdx-button>
				</div>
				<!-- Language Search block -->
				<div
					v-if="showLanguageSearch"
					class="ext-wikilambda-about-language-list-search"
				>
					<cdx-search-input
						v-model="searchTerm"
						:placeholder="searchPlaceholder"
						@update:model-value="onUpdateSearchTerm"
					></cdx-search-input>
				</div>
			</template>
			<!-- Dialog Body: Language Items block -->
			<div class="ext-wikilambda-about-language-items">
				<div
					v-for="item in items"
					:key="'dialog-lang-' + item.langZid + '-' + item.langLabel"
					class="ext-wikilambda-about-language-item"
					@click="editLanguage( item.langZid )"
				>
					<div class="ext-wikilambda-about-language-item-title">
						{{ item.langLabel }}
					</div>
					<div class="ext-wikilambda-about-language-item-field">
						<span
							v-if="item.hasMetadata"
							:class="{ 'ext-wikilambda-about-language-item-untitled': !item.hasName }"
						>
							{{ item.name }}
						</span>
						<a v-else>{{ $i18n( 'wikilambda-about-widget-add-language' ).text() }}</a>
					</div>
				</div>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxSearchInput = require( '@wikimedia/codex' ).CdxSearchInput,
	icons = require( '../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-about-view-languages-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-icon': CdxIcon,
		'cdx-search-input': CdxSearchInput
	},
	props: {
		open: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	data: function () {
		return {
			icons: icons,
			searchTerm: '',
			lookupResults: []
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getMetadataLanguages',
		'getZMonolingualTextValue',
		'getZPersistentName'
	] ), {
		/**
		 * Returns a list of all the language Zids that are present
		 * in the metadata collection (must have at least a name, a
		 * description or a set of aliases).
		 *
		 * @return {Array}
		 */
		allLangs: function () {
			return this.getMetadataLanguages();
		},

		/**
		 * Builds the list of items that correspond to the available
		 * languages in the object. Each item contains the language Zid
		 * and label, the Name/Label in that languege, and the flags
		 * hasMetadata and hasName that will condition the style.
		 *
		 * @return {Array}
		 */
		localItems: function () {
			return this.allLangs.map( ( langZid ) => {
				const thisName = this.getZPersistentName( langZid );
				return {
					langZid,
					langLabel: this.getLabel( langZid ),
					hasName: ( thisName !== undefined ),
					hasMetadata: true,
					name: thisName ?
						this.getZMonolingualTextValue( thisName.rowId ) :
						this.$i18n( 'wikilambda-editor-default-name' ).text()
				};
			} );
		},

		/**
		 * Returns the list of items that will be rendered in the component.
		 * This list can include the locally available languages and the ones
		 * returned by a language lookup.
		 *
		 * @return {Array}
		 */
		items: function () {
			return ( this.lookupResults.length > 0 ) ?
				this.lookupResults :
				this.localItems;
		},

		/**
		 * Whether to show the language search box or not. When the available
		 * languages with metadata information are more than ABOUT_DIALOG_MAX_ITEMS
		 * we render the search box to allow the user to filter and search languages.
		 *
		 * @return {boolean}
		 */
		showLanguageSearch: function () {
			return this.allLangs.length > Constants.ABOUT_DIALOG_MAX_ITEMS;
		},

		/**
		 * Returns an object of type DialogAction that describes
		 * the action of the secondary (cancel) button.
		 *
		 * @return {Object}
		 */
		defaultAction: function () {
			return {
				label: this.$i18n( 'wikilambda-about-widget-add-language' ).text()
			};
		},

		/**
		 * Returns the i18n message for the language search box placeholder
		 *
		 * @return {string}
		 */
		searchPlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-search-language-placeholder' ).text();
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'lookupZObject'
	] ), {
		/**
		 * Returns whether the given language Zid has any metadata
		 * in the current object (either name, description or aliases)
		 *
		 * @param {string} langZid
		 * @return {boolean}
		 */
		hasAnyMetadata: function ( langZid ) {
			return ( this.allLangs.includes( langZid ) );
		},

		/**
		 * Emits the openEditLanguage action so that we go to the
		 * edit metadata dialog for the given language.
		 *
		 * @param {string} lang
		 */
		editLanguage: function ( lang ) {
			this.$emit( 'open-edit-language', lang );
		},

		/**
		 * Emits the openEditLanguage action so that we go to the
		 * edit metadata dialog for a new language.
		 */
		addLanguage: function () {
			this.$emit( 'open-add-language' );
		},

		/**
		 * Close the dialog and make sure that the selected language
		 * and unsaved changes are cleared.
		 */
		closeDialog: function () {
			this.$emit( 'close' );
		},

		/**
		 * Update the lookupResults when there's a new search
		 * term in the language search box.
		 *
		 * @param {string} value
		 */
		onUpdateSearchTerm: function ( value ) {
			if ( !value ) {
				this.lookupResults = [];
				return;
			}
			this.getLookupResults( value );
		},

		/**
		 * Triggers a lookup API to search for matches for the
		 * given substring and formats the results to be shown
		 * in the dialog list.
		 *
		 * @param {string} substring
		 */
		getLookupResults: function ( substring ) {
			const allZids = [];
			this.lookupZObject( {
				input: substring,
				type: Constants.Z_NATURAL_LANGUAGE
			} ).then( ( payload ) => {
				// If the string searched has changed, do not show the search result
				if ( !this.searchTerm.includes( substring ) ) {
					return;
				}
				// Compile information for every search result
				this.lookupResults = payload
					.map( ( result ) => {
						const name = this.getZPersistentName( result.page_title );
						allZids.push( result.page_title );
						return {
							langZid: result.page_title,
							langLabel: result.label,
							hasName: !!name,
							hasMetadata: this.hasAnyMetadata( result.page_title ),
							name: name ?
								this.getZMonolingualTextValue( name.rowId ) :
								this.$i18n( 'wikilambda-editor-default-name' ).text()
						};
					} )
					.sort( ( a, b ) => {
						// Sorts the results so that the items with an available name
						// come first, then the items with any available metadata,
						// and finally the items that don't have any metadata yet.
						if ( a.hasName ) {
							return -2;
						}
						if ( b.hasName ) {
							return 2;
						}
						if ( a.hasMetadata ) {
							return -1;
						}
						if ( b.hasMetadata ) {
							return 1;
						}
						return 0;
					} );
				// Fetch the result zid information (labels)
				this.fetchZKeys( { zids: allZids } );
			} );
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-about-language-list {
	gap: @spacing-100;

	.cdx-dialog__body {
		max-height: 304px;
		padding: @spacing-50 0;
		border-bottom: 1px solid @border-color-subtle;
		border-top: 1px solid @border-color-subtle;

		@media screen and ( max-width: @width-breakpoint-tablet ) {
			max-height: 344px;
		}
	}

	.ext-wikilambda-about-language-list-search {
		padding: @spacing-100 @spacing-150 0;
	}

	.ext-wikilambda-about-language-items {
		.ext-wikilambda-about-language-item {
			padding: @spacing-50 @spacing-150;

			&:hover {
				cursor: pointer;
				background-color: @background-color-interactive;
			}

			.ext-wikilambda-about-language-item-title {
				text-transform: capitalize;
				margin: 0;
			}

			.ext-wikilambda-about-language-item-field {
				margin: 0;
				color: @color-subtle;

				.ext-wikilambda-about-language-item-untitled {
					color: @color-placeholder;
					font-style: italic;
				}
			}
		}
	}
}

</style>
