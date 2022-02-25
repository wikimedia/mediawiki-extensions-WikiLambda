<template>
	<!--
		WikiLambda Vue component for selecting a type inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<a
			v-if="readonly || viewmode"
			:href="'/wiki/' + selectedId"
			:target="referenceLinkTarget"
		>
			{{ selectedText }}
		</a>
		<sd-autocomplete-search-input
			v-else
			name="zobject-selector"
			:class="{ 'ext-wikilambda-zkey-input-invalid': validatorIsInvalid }"
			:label="placeholder"
			:placeholder="placeholder"
			:search-placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-search-placeholder' )"
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@reset="onReset"
			@submit="onSubmit"
			@clear-lookup-results="onClearLookupResults"
		>
		</sd-autocomplete-search-input>
		<sd-message
			v-if="validatorIsInvalid"
			:inline="true"
			type="error"
		> {{ validatorErrorMessage }} </sd-message>
	</span>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	SdAutocompleteSearchInput = require( '../base/AutocompleteSearchInput.vue' ),
	SdMessage = require( '../base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'fn-editor-type-selector',
	components: {
		'sd-autocomplete-search-input': SdAutocompleteSearchInput,
		'sd-message': SdMessage
	},
	extends: ZObjectSelector,
	computed: mapGetters( [
		'getZkeyLabels'
	] ),
	methods: {
		onReset: function () {
			this.lookupResults = this.getDefaultResults();
		},
		getDefaultResults: function () {
			var results = {};

			results[ Constants.Z_STRING ] = this.getZkeyLabels[ Constants.Z_STRING ];
			results[ Constants.Z_REFERENCE ] = this.getZkeyLabels[ Constants.Z_REFERENCE ];
			results[ Constants.Z_LIST ] = this.getZkeyLabels[ Constants.Z_LIST ];
			results[ Constants.Z_BOOLEAN ] = this.getZkeyLabels[ Constants.Z_BOOLEAN ];
			results[ Constants.Z_TYPED_LIST ] = this.getZkeyLabels[ Constants.Z_TYPED_LIST ];

			return results;
		}
	},
	mounted: function () {
		this.fetchZKeyWithDebounce( [
			Constants.Z_STRING,
			Constants.Z_REFERENCE,
			Constants.Z_LIST,
			Constants.Z_BOOLEAN,
			Constants.Z_TYPED_LIST
		] );
	}
};
</script>
