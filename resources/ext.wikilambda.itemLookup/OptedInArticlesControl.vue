<template>
	<cdx-field
		:id="controlWrapper.id"
		:status="statusMessages.error ? 'error' : 'default'"
		:messages="statusMessages"
		:is-fieldset="true"
	>
		<template v-if="hasLabel" #label>
			{{ controlWrapper.label.text() }}
		</template>
		<template v-if="hasDescription" #description>
			<span v-i18n-html="controlWrapper.description"></span>
		</template>

		<div
			v-for="( row, index ) in rows"
			:key="row.key"
			class="ext-wikilambda-optedInArticles__row"
		>
			<cdx-field
				:is-fieldset="false"
				class="ext-wikilambda-optedInArticles__item"
				:status="row.topicTouched && !row.qid ? 'error' : 'default'"
				:messages="{ error: $i18n(
					'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-error-empty'
				).text() }"
			>
				<div class="ext-wikilambda-optedInArticles__control">
					<cdx-lookup
						:selected="row.qid || null"
						:input-value="row.inputValue"
						:disabled="offline"
						:placeholder="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-placeholder'
						).text()"
						:menu-items="row.menuItems"
						:menu-config="{ visibleItemLimit: 5 }"
						@update:input-value="( value ) => onItemInput( index, value )"
						@update:selected="( value ) => onItemSelected( index, value )"
						@blur="row.topicTouched = true"
					>
						<template #no-results>
							{{ $i18n(
								'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-no-results'
							).text() }}
						</template>
					</cdx-lookup>
					<a
						v-if="abstractUrl"
						:class="linkClasses( topicUrl( row ) )"
						:href="topicUrl( row )"
						:aria-disabled="!topicUrl( row ) || null"
						target="_blank"
						rel="noopener"
						:title="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-link-label'
						).text()"
						:aria-label="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-link-label'
						).text()"
					>
						<cdx-icon :icon="iconLinkExternal"></cdx-icon>
					</a>
				</div>
				<template #label>
					{{ $i18n( 'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-label' ).text() }}
				</template>
				<template #help-text>
					{{ $i18n(
						'communityconfiguration-abstractwikioptedinarticles-optedinarticles-qid-help-text'
					).text() }}
				</template>
			</cdx-field>

			<cdx-field
				:is-fieldset="false"
				class="ext-wikilambda-optedInArticles__titles"
				:status="row.titlesTouched && !row.titleChips.length ? 'error' : 'default'"
				:messages="{ error: $i18n(
					'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-error-empty'
				).text() }"
			>
				<!-- The buttons sit beside the input, so they line up with the inputs. -->
				<div class="ext-wikilambda-optedInArticles__control">
					<cdx-chip-input
						:input-chips="row.titleChips"
						:disabled="offline"
						:separate-input="true"
						:chip-validator="isNewTitle"
						:placeholder="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-placeholder'
						).text()"
						@update:input-chips="( chips ) => onTitlesUpdated( index, chips )"
						@focusout="row.titlesTouched = true"
					></cdx-chip-input>
					<a
						:class="linkClasses( pageUrl( row ) )"
						:href="pageUrl( row )"
						:aria-disabled="!pageUrl( row ) || null"
						target="_blank"
						rel="noopener"
						:title="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-link-label'
						).text()"
						:aria-label="$i18n(
							'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-link-label'
						).text()"
					>
						<cdx-icon :icon="iconLinkExternal"></cdx-icon>
					</a>
					<cdx-button
						class="ext-wikilambda-optedInArticles__remove"
						type="button"
						action="destructive"
						:disabled="offline"
						:aria-label="$i18n(
							'communityconfiguration-editor-array-remove-element-label-screen-reader'
						).text()"
						weight="quiet"
						@click="onRemoveRow( index )"
					>
						<cdx-icon :icon="iconTrash"></cdx-icon>
					</cdx-button>
				</div>
				<template #label>
					{{ $i18n(
						'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-label'
					).text() }}
				</template>
				<template #help-text>
					{{ $i18n(
						'communityconfiguration-abstractwikioptedinarticles-optedinarticles-title-help-text'
					).text() }}
				</template>
			</cdx-field>
		</div>

		<!-- The form around the control must not submit on a click. -->
		<cdx-button
			type="button"
			:disabled="offline"
			@click="onAddRow"
		>
			<cdx-icon :icon="iconAdd"></cdx-icon>
			{{ $i18n(
				'communityconfiguration-abstractwikioptedinarticles-optedinarticles-add-element-button-label'
			).text() }}
		</cdx-button>
	</cdx-field>
</template>

<script>
/**
 * WikiLambda form control for the list of articles opted in to Abstract Wikipedia content.
 *
 * Each entry of the list pairs a Wikidata item with the local titles that show its Abstract
 * Wikipedia content. The data schema alone gives a generic array of objects, so a sysop types a
 * Qid with no way to tell whether it is the right topic. This control offers the topics that
 * Abstract Wikipedia generates articles for, by name, and shows the name of an item that the list
 * already holds. Each topic and each title can belong to one row only.
 *
 * This control takes the whole list, not one field of it, because the first iteration of the UI
 * schema in CommunityConfiguration places top-level properties only. The Qid sits at
 * `#/properties/OptedInArticles/items/properties/qid`, which a layout cannot yet name. Once the UI
 * schema reaches into a nested property, this can become a plain item lookup for the Qid field and
 * leave the shape of the list to the generic array control.
 *
 * The stored value keeps its shape exactly: a list of `{ title: [ ... ], qid: 'Q...' }`. The
 * pattern on the Qid and the one-title minimum stay in the data schema and still decide what is
 * valid, so this control only makes invalid input harder to produce.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const { ref, unref, computed, onMounted } = require( 'vue' );
const {
	CdxButton,
	CdxChipInput,
	CdxField,
	CdxIcon,
	CdxLookup
} = require( './codex.js' );
const { cdxIconAdd, cdxIconLinkExternal, cdxIconTrash } = require( './icons.json' );
const { abstractUrl, topics } = require( './itemLookupConfig.json' );
const {
	rendererProps,
	useCodexControl,
	useJsonFormControl
} = require( 'ext.communityConfiguration.Editor.controls' );
// Required as a whole, not destructured, so that a test can replace the calls.
const itemLookupApi = require( './itemLookupApi.js' );

/**
 * @param {Object|null} message An mw.Message, or null when the key has no message
 * @return {boolean}
 */
function messageExists( message ) {
	return !!message && message.exists();
}

/**
 * The text that names an item, in the lookup and in its menu. The QID stays in it, because
 * different items can have the same name.
 *
 * @param {string} label
 * @param {string} qid
 * @return {string}
 */
function itemText( label, qid ) {
	return `${ label } (${ qid })`;
}

/**
 * Only pages in the main namespace show Abstract Wikipedia content, and the integration finds them
 * by their normal form of the title.
 *
 * @param {string} value
 * @return {string|null} The normal form of the title, or null if it cannot be an article
 */
function articleTitle( value ) {
	const title = mw.Title.newFromText( String( value ) );
	return title && title.getNamespaceId() === 0 ? title.getPrefixedText() : null;
}

/**
 * The rows carry state that the stored value does not: the text in the lookup and the current
 * menu. A key of their own keeps Vue from reusing a row for another
 * article when one is removed.
 *
 * @param {Object} entry One stored `{ title, qid }` entry
 * @param {number} index
 * @return {Object} The row state
 */
function toRow( entry, index ) {
	const titles = Array.isArray( entry.title ) ? entry.title : [];
	return {
		key: `row-${ index }-${ entry.qid || 'new' }`,
		qid: entry.qid || '',
		inputValue: entry.qid || '',
		menuItems: [],
		// Set once the sysop leaves a field or changes it, so a new row is not wrong at once. The data
		// schema needs a topic and a title too, but tells only on save, in terms of the stored value.
		topicTouched: false,
		titlesTouched: false,
		titleChips: titles.map( ( title ) => ( { value: title, label: title } ) )
	};
}

// @vue/component
module.exports = exports = {
	name: 'wl-opted-in-articles-control',
	components: {
		CdxButton,
		CdxChipInput,
		CdxField,
		CdxIcon,
		CdxLookup
	},
	props: Object.assign( {}, rendererProps() ),
	setup( props ) {
		const {
			control,
			controlWrapper,
			onChange
		} = useCodexControl( useJsonFormControl( props ) );

		// The offline client mode cannot reach Wikidata, so there is nothing to search with.
		const offline = mw.config.get( 'wgWikiLambdaClientModeOffline' ) === true;
		const language = mw.config.get( 'wgUserLanguage' );

		const stored = unref( control.modelValue ) || [];
		const rows = ref( stored.map( toRow ) );
		let nextKey = rows.value.length;
		// The labels of the allowed topics and of the stored items, by Qid.
		const labels = ref( {} );

		/**
		 * Write the rows back as the stored value. The row state that only the form needs stays
		 * out of it, so the shape of the configuration does not change.
		 */
		function save() {
			onChange( rows.value.map( ( row ) => ( {
				title: row.titleChips.map( ( chip ) => String( chip.value ) ),
				qid: row.qid
			} ) ) );
		}

		/**
		 * @param {string} qid
		 * @return {string} The name and Qid of the item, or the bare Qid if it has no label
		 */
		function itemLabel( qid ) {
			return labels.value[ qid ] ? itemText( labels.value[ qid ], qid ) : qid;
		}

		/**
		 * Get the names of the allowed topics, and show the name of each item the list already
		 * holds in place of its bare Qid. One request does both.
		 */
		onMounted( () => {
			const ids = [ ...new Set( topics.concat( rows.value.map( ( row ) => row.qid ) ) ) ]
				.filter( Boolean );
			if ( offline || ids.length === 0 ) {
				return;
			}
			itemLookupApi.fetchItemLabels( { ids, language } ).then( ( fetched ) => {
				labels.value = fetched;
				rows.value = rows.value.map( ( row ) => (
					fetched[ row.qid ] ?
						Object.assign( {}, row, { inputValue: itemLabel( row.qid ) } ) :
						row
				) );
			// An item that Wikidata does not know, or no connection, keeps its bare Qid.
			}, () => {} );
		} );

		/**
		 * On selection CdxLookup puts the label of the item in the input, so the label holds the
		 * Qid too, which also lets the sysop find a topic by its Qid.
		 *
		 * @param {number} index The row
		 * @param {string} value The text in the lookup
		 * @return {Object[]} The allowed topics that match, less those that other rows have
		 */
		function topicMenu( index, value ) {
			const term = value.toLowerCase();
			const taken = rows.value.filter( ( row, i ) => i !== index ).map( ( row ) => row.qid );
			return topics
				.filter( ( qid ) => !taken.includes( qid ) )
				.map( ( qid ) => ( { value: qid, label: itemLabel( qid ) } ) )
				.filter( ( item ) => item.label.toLowerCase().includes( term ) );
		}

		return {
			controlWrapper,
			statusMessages: computed( () => unref( controlWrapper.statusMessages ) || {} ),
			hasLabel: messageExists( controlWrapper.label ),
			hasDescription: messageExists( controlWrapper.description ),
			iconAdd: cdxIconAdd,
			iconLinkExternal: cdxIconLinkExternal,
			iconTrash: cdxIconTrash,
			offline,
			rows,
			abstractUrl,
			/**
			 * Codex has no link component, so the links use the CSS-only button classes. A link
			 * with nowhere to go stays in place, disabled, so that every row has the same layout.
			 *
			 * @param {string|null} url
			 * @return {string[]}
			 */
			linkClasses( url ) {
				return [
					'cdx-button',
					'cdx-button--fake-button',
					url ? 'cdx-button--fake-button--enabled' : 'cdx-button--fake-button--disabled',
					'cdx-button--weight-quiet',
					'cdx-button--icon-only'
				];
			},
			topicUrl( row ) {
				return row.qid ? abstractUrl.replace( '$1', encodeURIComponent( row.qid ) ) : null;
			},
			pageUrl( row ) {
				return row.titleChips.length ? mw.util.getUrl( String( row.titleChips[ 0 ].value ) ) : null;
			},
			onItemInput( index, value ) {
				const row = rows.value[ index ];
				if ( !row ) {
					return;
				}
				row.inputValue = value;
				row.menuItems = value && !offline ? topicMenu( index, value ) : [];
			},
			onItemSelected( index, value ) {
				const row = rows.value[ index ];
				// CdxLookup clears the selection when the text no longer matches an item. Keep the
				// stored Qid until another item is chosen, so that typing does not silently empty
				// a row that was already set.
				if ( !row || !value ) {
					return;
				}
				const chosen = row.menuItems.find( ( item ) => item.value === value );
				row.qid = value;
				row.inputValue = chosen ? chosen.label : value;
				save();
			},
			/**
			 * @param {string} value The text of a new title
			 * @return {boolean} Whether it can be an article that no row has yet
			 */
			isNewTitle( value ) {
				// CdxChipInput also asks on blur with no text, and then adds no chip.
				if ( String( value ).trim() === '' ) {
					return true;
				}
				const text = articleTitle( value );
				return !!text && !rows.value.some(
					( row ) => row.titleChips.some( ( chip ) => chip.value === text )
				);
			},
			onTitlesUpdated( index, chips ) {
				const row = rows.value[ index ];
				if ( !row ) {
					return;
				}
				// A stored title that is not valid stays as it is, for the sysop to fix.
				row.titlesTouched = true;
				row.titleChips = chips.map( ( chip ) => {
					const text = articleTitle( chip.value ) || String( chip.value );
					return { value: text, label: text };
				} );
				save();
			},
			onAddRow() {
				nextKey++;
				rows.value.push( toRow( { title: [], qid: '' }, nextKey ) );
				// Nothing is saved yet: a row with no item and no title would not validate, and
				// the sysop is in the middle of filling it in.
			},
			onRemoveRow( index ) {
				rows.value.splice( index, 1 );
				save();
			}
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-wikilambda-optedInArticles {
	&__row {
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-50;
		align-items: flex-start;
		margin-bottom: @spacing-100;
		padding-bottom: @spacing-75;
		border-bottom: @border-subtle;

		// Codex puts a top margin on each field after the first, which is wrong side by side.
		> .cdx-field {
			margin-top: 0;
		}
	}

	// The columns share the row but keep room for their inputs and buttons, and wrap when narrow.
	&__item,
	&__titles {
		flex: 1 1 0;
	}

	&__control {
		display: flex;
		gap: @spacing-50;
		align-items: flex-start;

		// Codex clips these inputs, so without a minimum they shrink under their own content.
		.cdx-lookup,
		.cdx-chip-input {
			flex: 1;
			min-width: @min-width-medium;
		}
	}
}
</style>
