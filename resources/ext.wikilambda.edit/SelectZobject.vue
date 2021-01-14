<template>
	<!--
		WikiLambda Vue interface module for selecting any ZObject,
		with autocompletion on name

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<span v-if="viewmode">{{ searchText }}</span>
		<input v-else
			v-model="searchText"
			type="search"
			@input="updateSearch"
			@focus="onFocus"
			@blur="onBlur"
		>
		<span v-if="selectedId">({{ selectedId }})</span>
		<div v-if="showList" class="ext-wikilambda-zobject-list">
			<div v-for="(label, zid) in searchResults"
				:key="zid"
				class="ext-wikilambda-zobject-list-item"
				@mousedown.prevent="onClickResult(zid)"
			>
				{{ label }} ({{ zid }})
			</div>
		</div>
	</span>
</template>

<script>
var mapState = require( 'vuex' ).mapState,
	mapMutations = require( 'vuex' ).mapMutations;

module.exports = {
	name: 'SelectZobject',
	props: [ 'viewmode', 'type', 'searchText', 'selectedId' ],
	data: function () {
		return {
			showList: false,
			searchResults: {}
		};
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys',
			'zLangs',
			'zKeys',
			'zKeyLabels'
		] )
	),
	methods: $.extend( {},
		mapMutations( [ 'addZKeyLabel' ] ),
		{
			updateSearch: function () {
				var self = this;
				if ( this.searchText === '' && ( !this.type ) ) {
					this.searchResults = {};
					this.showList = false;
					this.selectedId = null;
				} else if ( /^Z\d+$/.test( this.searchText ) ) {
					this.selectedId = this.searchText;
					this.$emit( 'input', this.searchText );
					this.showList = false;
				} else {
					clearTimeout( this.timerId );
					this.timerId = setTimeout( function () {
						self.updateSearchUnBounced();
					}, 200 );
				}
			},
			updateSearchUnBounced: function () {
				var api = new mw.Api(),
					self = this,
					queryType = 'wikilambda_searchlabels';
				api.get( {
					action: 'query',
					list: queryType,
					// eslint-disable-next-line camelcase
					wikilambda_search: self.searchText,
					// eslint-disable-next-line camelcase
					wikilambda_type: self.type,
					// eslint-disable-next-line camelcase
					wikilambda_language: 'en'
				} ).done( function ( data ) {
					self.searchResults = {};
					self.showList = false;
					self.selectedId = null;
					if ( 'query' in data &&
						queryType in data.query
					) {
						data.query[ queryType ].forEach(
							function ( result ) {
								var zid = result.page_title,
									label = result.label;
								self.searchResults[ zid ] = label;
								if ( !( zid in self.zKeyLabels ) ) {
									self.addZKeyLabel( {
										key: zid,
										label: label
									} );
								}
							}
						);
						self.showList = true;
					}
				} );
			},
			onClickResult: function ( zid ) {
				this.searchText = this.searchResults[ zid ];
				this.selectedId = zid;
				this.$emit( 'input', zid );
				this.showList = false;
			},
			onFocus: function () {
				this.updateSearch();
				this.showList = true;
			},
			onBlur: function () {
				this.showList = false;
			}
		}
	)
};
</script>

<style lang="less">
.ext-wikilambda-select-zobject {
	position: relative;
}

.ext-wikilambda-select-zobject .ext-wikilambda-zobject-list {
	position: absolute;
	background-color: #fff;
	box-shadow: 0 8px 16px 0 rgba( 0, 0, 0, 0.2 );
	z-index: 1;
}

.ext-wikilambda-select-zobject .ext-wikilambda-zobject-list .ext-wikilambda-zobject-list-item {
	cursor: pointer;
	margin-left: 0.5em;
}

.ext-wikilambda-select-zobject .ext-wikilambda-zobject-list .ext-wikilambda-zobject-list-item:hover {
	background-color: #ddd;
}

</style>
