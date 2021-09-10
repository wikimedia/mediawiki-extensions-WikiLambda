<template>
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
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@blur="onSubmit"
			@focus="onFocus"
			@submit="onSubmit"
			@clear="onClear"
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
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	extends: ZObjectSelector,
	computed: mapGetters( [
		'getZkeyLabels'
	] ),
	methods: {
		onFocus: function () {
			this.lookupResults = this.getDefaultResults();
		},
		getDefaultResults: function () {
			var results = {};

			results[ Constants.Z_STRING ] = this.getZkeyLabels[ Constants.Z_STRING ];
			results[ Constants.Z_REFERENCE ] = this.getZkeyLabels[ Constants.Z_REFERENCE ];
			results[ Constants.Z_LIST ] = this.getZkeyLabels[ Constants.Z_LIST ];
			results[ Constants.Z_BOOLEAN ] = this.getZkeyLabels[ Constants.Z_BOOLEAN ];

			return results;
		}
	},
	mounted: function () {
		this.fetchZKeys( [ 'Z6', 'Z9', 'Z10', 'Z40' ] );
	}
};
</script>
