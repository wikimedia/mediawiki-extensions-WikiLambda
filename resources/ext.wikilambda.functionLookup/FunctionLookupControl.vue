<template>
	<cdx-field
		:id="controlWrapper.id"
		:status="statusMessages.error ? 'error' : 'default'"
		:messages="statusMessages"
		:is-fieldset="false"
	>
		<cdx-multiselect-lookup
			v-model:input-chips="chips"
			v-model:selected="selection"
			v-model:input-value="inputValue"
			:disabled="offline"
			:placeholder="placeholder"
			:menu-items="menuItems"
			:menu-config="{ visibleItemLimit: 5 }"
			:highlight-query="true"
			:no-results-text="$i18n( 'wikilambda-functionlookup-no-results' ).text()"
			:remove-button-label="$i18n( 'wikilambda-functionlookup-remove-button-label' ).text()"
			@update:input-value="onInput"
			@update:input-chips="onChipsUpdated"
		></cdx-multiselect-lookup>
		<template v-if="hasLabel" #label>
			{{ controlWrapper.label.text() }}
		</template>
		<template v-if="hasDescription" #description>
			<span v-i18n-html="controlWrapper.description"></span>
		</template>
		<template v-if="hasHelpText || hint" #help-text>
			<span v-if="hasHelpText" v-i18n-html="controlWrapper.helpText"></span>
			<span v-if="hint" class="ext-wikilambda-functionLookup__hint">{{ hint }}</span>
		</template>
	</cdx-field>
</template>

<script>
/**
 * WikiLambda form control for a list of Wikifunctions.
 *
 * A community configuration form uses this in place of the plain chip list of strings that the
 * data schema would otherwise get. It shows the label of each function, so that a sysop does not
 * have to type ZIDs blind, and it can limit the search to functions that return a given type.
 *
 * The UI schema of a provider selects this control by name, and can pass options:
 *
 *     [
 *         UISchema::TYPE => UISchema::TYPE_CONTROL,
 *         UISchema::SCOPE => '#/properties/SuggestedFunctions',
 *         UISchema::CONTROL => 'WikiLambda.FunctionLookup',
 *         UISchema::OPTIONS => [ 'outputType' => 'Z89' ],
 *     ]
 *
 * The stored value stays a flat list of ZID strings, so nothing that reads the configuration
 * changes.
 *
 * This control draws its own CdxField from the properties that CommunityConfiguration supplies in
 * controlWrapper. It must not use the CdxField of CommunityConfiguration: ResourceLoader gives
 * each Codex module a separate copy of Codex, the injection keys of Codex are Symbol values, and
 * so a field in one module cannot reach the input in another. The label would lose its link to
 * the input, and the error state and the disabled state would not arrive.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const { ref, unref, computed, onMounted } = require( 'vue' );
// The module has its own localBasePath, so the Codex bundle sits next to these files.
const { CdxField, CdxMultiselectLookup } = require( './codex.js' );
const {
	debounce,
	rendererProps,
	useCodexControl,
	useJsonFormControl
} = require( 'ext.communityConfiguration.Editor.controls' );
// Required as a whole, not destructured, so that a test can replace searchFunctions.
const functionLookupApi = require( './functionLookupApi.js' );

/**
 * Turn one search result into a menu item. The label goes on top and the ZID below it, because
 * the ZID is what the configuration stores and what a sysop has to be able to recognise.
 *
 * @param {Object} result A row of the wikilambdasearch_functions response
 * @return {{value: string, label: string, description: string}}
 */
function toMenuItem( result ) {
	return {
		value: result.page_title,
		label: result.label || result.page_title,
		description: result.page_title
	};
}

/**
 * @param {Object|null} message An mw.Message, or null when the key has no message
 * @return {boolean}
 */
function messageExists( message ) {
	return !!message && message.exists();
}

// @vue/component
module.exports = exports = {
	name: 'wl-function-lookup-control',
	components: {
		CdxField,
		CdxMultiselectLookup
	},
	props: Object.assign( {}, rendererProps() ),
	setup( props ) {
		const {
			control,
			controlWrapper,
			onChange
		} = useCodexControl( useJsonFormControl( props ) );

		// The UI schema decides what the control may offer. Abstract mode only accepts functions
		// that return HTML, because it puts the result straight into an article.
		const options = props.uischema.options || {};
		const outputType = options.outputType;
		// A hint that belongs to this list rather than to the control. The UI schema names the
		// message, and its MESSAGES key makes the server send the text to the client, so the
		// control does not have to know which lists exist.
		const hint = options.hintMessage ?
			mw.message( options.hintMessage ).text() :
			null;
		// The offline client mode has no connection to the repository, so there is nothing to
		// search with. Show the ZIDs that are stored, and let nobody change them.
		const offline = mw.config.get( 'wgWikiLambdaClientModeOffline' ) === true;
		const language = mw.config.get( 'wgUserLanguage' );

		const storedZids = unref( control.modelValue ) || [];
		const chips = ref( storedZids.map( ( zid ) => ( { value: zid, label: zid } ) ) );
		// CdxMultiselectLookup owns both the chips and the selection, through v-model. Deriving
		// one from the other here would set the two off updating each other without end.
		const selection = ref( [ ...storedZids ] );
		const inputValue = ref( '' );
		const menuItems = ref( [] );
		const currentSearchTerm = ref( '' );

		// Show the label of a function that the configuration already holds, rather than its bare
		// ZID. The search matches on the ZID when the term is a ZID.
		// TODO: this makes one request for each ZID. The lists hold at most ten, so the number is
		// bounded, but one call that takes many ZIDs would be better.
		onMounted( () => {
			if ( offline || storedZids.length === 0 ) {
				return;
			}
			Promise.all( storedZids.map( ( zid ) => functionLookupApi.searchFunctions( {
				search: zid,
				language,
				outputType,
				limit: 1
			} ).then(
				( results ) => results.find( ( result ) => result.page_title === zid ) || null,
				// A ZID that the repository does not know keeps its bare ZID as the label.
				() => null
			) ) ).then( ( results ) => {
				chips.value = storedZids.map( ( zid, index ) => ( {
					value: zid,
					label: results[ index ] && results[ index ].label ?
						`${ results[ index ].label } (${ zid })` :
						zid
				} ) );
			} );
		} );

		const onInput = debounce( ( value ) => {
			currentSearchTerm.value = value;

			if ( !value || offline ) {
				menuItems.value = [];
				return;
			}

			functionLookupApi.searchFunctions( { search: value, language, outputType } )
				.then( ( results ) => {
					// A later search started while this one was in flight.
					if ( currentSearchTerm.value !== value ) {
						return;
					}
					// There is no free text entry, unlike the page title control of
					// CommunityConfiguration. A string that is not a ZID is not a function, so
					// offering it would only store a reference that resolves to nothing.
					const chosen = selection.value;
					menuItems.value = results
						.map( toMenuItem )
						.filter( ( item ) => !chosen.includes( item.value ) );
				} )
				.catch( () => {
					menuItems.value = [];
				} );
		}, 300 );

		return {
			controlWrapper,
			// useCodexControl passes the status messages on as a ref.
			statusMessages: computed( () => unref( controlWrapper.statusMessages ) || {} ),
			hasLabel: messageExists( controlWrapper.label ),
			hasDescription: messageExists( controlWrapper.description ),
			hasHelpText: messageExists( controlWrapper.helpText ),
			hint,
			offline,
			placeholder: offline ?
				mw.msg( 'wikilambda-functionlookup-offline-placeholder' ) :
				mw.msg( 'wikilambda-functionlookup-placeholder' ),
			chips,
			selection,
			inputValue,
			menuItems,
			onInput,
			onChipsUpdated( newChips ) {
				// The value comes from the chips rather than from the selection. The chips are
				// what the form shows and what a sysop removes, and CdxMultiselectLookup settles
				// the chips and the selection together, so the chips are the state that always
				// matches the form.
				// Nothing is assigned here: the chips belong to CdxMultiselectLookup through
				// v-model, and assigning them again would make it emit again, without end.
				// A CommunityConfiguration control writes through onChange. It does not emit
				// update:modelValue.
				onChange( newChips.map( ( chip ) => chip.value ) );
			}
		};
	}
};
</script>
